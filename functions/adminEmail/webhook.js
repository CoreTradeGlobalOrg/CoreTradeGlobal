/**
 * ZeptoMail webhook (.planning/ADMIN_EMAIL_PLAN.md, Phase 3).
 *
 * Hard bounces and spam complaints land in emailSuppressions/{emailHash};
 * admin email never goes to those addresses again. When the email came from
 * an admin send, client_reference is "campaignId:emailHash" and the
 * recipient and campaign counters are updated too.
 *
 * The payload shape follows what ZeptoMail actually posts (the help pages
 * differ): `event_name` is a list (["hardbounce"], ["fbl_compliant"] — sic),
 * `event_message` a list of { email_info, event_data }, and the address an
 * event is about is in event_data[].details[] — `bounced_recipient` for a
 * bounce, `to` for a complaint. email_info.to lists every recipient of the
 * message, so it is only used when the message had a single recipient.
 *
 * Authentication: the webhook is configured in ZeptoMail with an
 * authorization header named WEBHOOK_KEY_HEADER whose value must equal
 * ZEPTOMAIL_WEBHOOK_KEY.
 */

const crypto = require('crypto');
const { FieldValue } = require('firebase-admin/firestore');

const WEBHOOK_KEY_HEADER = 'x-webhook-key';

// A send pauses itself once this share of its sent emails hard-bounced (after
// at least AUTO_PAUSE_MIN_SENT), so a stale list is caught before it gets the
// ZeptoMail account blocked. The admin can clean the list and resume.
const AUTO_PAUSE_BOUNCE_RATE = 0.05;
const AUTO_PAUSE_MIN_SENT = 50;

function list(value) {
  return Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

/** "hard bounce", "hardbounce", "hard_bounce" → "hardbounce". */
function normalise(name) {
  return text(name).toLowerCase().replace(/[^a-z]/g, '');
}

function normalizeEmail(raw) {
  return text(raw).trim().toLowerCase();
}

function emailHash(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function isAuthorized(headerValue) {
  const expected = process.env.ZEPTOMAIL_WEBHOOK_KEY || '';
  const given = text(headerValue);
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Addresses in a details field that is a string or a list of strings. */
function named(details, field) {
  return details
    .flatMap((d) => (Array.isArray(d?.[field]) ? d[field] : [d?.[field]]))
    .map(normalizeEmail)
    .filter((address) => address.includes('@'));
}

/** Addresses in email_info.to: [{ email_address: { address } }]. */
function messageRecipients(to) {
  return list(to)
    .map((entry) => normalizeEmail(entry?.email_address?.address))
    .filter((address) => address.includes('@'));
}

/**
 * What a webhook body asks us to do.
 * @returns {{ type: 'hard_bounce'|'complaint', email: string, detail: string, clientReference: string }[]}
 */
function suppressionEvents(body) {
  const names = list(body?.event_name).map(normalise);
  const events = [];

  for (const message of list(body?.event_message)) {
    const info = message?.email_info || {};
    const data = list(message?.event_data);
    const objects = data.map((entry) => normalise(entry?.object));
    const details = data.flatMap((entry) => list(entry?.details));
    const all = [...names, ...objects];

    const hard = all.includes('hardbounce');
    const complaint = all.some((n) => ['fblcompliant', 'fblcomplaint', 'feedbackloop', 'fbl'].includes(n));
    if (!hard && !complaint) continue; // soft bounce, open, click, delivered

    const type = complaint ? 'complaint' : 'hard_bounce';
    let about = named(details, complaint ? 'to' : 'bounced_recipient');
    if (about.length === 0) {
      const to = messageRecipients(info.to);
      about = to.length === 1 ? to : [];
    }
    const detail = details
      .map((d) => [text(d?.reason), text(d?.diagnostic_message)].filter(Boolean).join(': '))
      .find(Boolean) || (complaint ? 'Marked as spam' : '');

    for (const email of new Set(about)) {
      events.push({ type, email, detail: detail.slice(0, 500), clientReference: text(info.client_reference) });
    }
  }
  return events;
}

/** Record one hard bounce or complaint. */
async function recordSuppression(db, { type, email, detail, clientReference }) {
  const hash = emailHash(email);
  await db.collection('emailSuppressions').doc(hash).set(
    {
      email,
      reason: type,
      detail,
      lastEventAt: FieldValue.serverTimestamp(),
      events: FieldValue.increment(1),
    },
    { merge: true }
  );

  // Admin sends use "campaignId:emailHash"; system email has no reference.
  const [campaignId, recipientHash] = clientReference.split(':');
  if (!campaignId || recipientHash !== hash) return;

  const campaignRef = db.collection('emailCampaigns').doc(campaignId);
  const recipientRef = campaignRef.collection('recipients').doc(hash);
  await db.runTransaction(async (tx) => {
    const [snap, campaignSnap] = await Promise.all([tx.get(recipientRef), tx.get(campaignRef)]);
    if (!snap.exists || !campaignSnap.exists || snap.get(type === 'complaint' ? 'complainedAt' : 'bouncedAt')) return;
    tx.update(recipientRef, {
      [type === 'complaint' ? 'complainedAt' : 'bouncedAt']: FieldValue.serverTimestamp(),
      bounceDetail: detail,
    });

    const campaignUpdate = {
      [type === 'complaint' ? 'counts.complaints' : 'counts.bounced']: FieldValue.increment(1),
    };
    const { status, counts = {} } = campaignSnap.data();
    const bounced = (counts.bounced || 0) + (type === 'hard_bounce' ? 1 : 0);
    const sent = counts.sent || 0;
    if (
      type === 'hard_bounce' &&
      ['queued', 'sending'].includes(status) &&
      sent >= AUTO_PAUSE_MIN_SENT &&
      bounced / sent >= AUTO_PAUSE_BOUNCE_RATE
    ) {
      campaignUpdate.status = 'paused';
      campaignUpdate.pausedAt = FieldValue.serverTimestamp();
      campaignUpdate.lastError = `Paused automatically: ${bounced} of ${sent} sent emails bounced. Check the list before resuming.`;
    }
    tx.update(campaignRef, campaignUpdate);
  });
}

/**
 * Handle one webhook request. Returns [status, body].
 * A request without the key gets 403. An authorized request with nothing to
 * act on (ZeptoMail's Verify ping, soft bounces, opens) gets 200.
 */
async function handleWebhook(db, { method, headers, body }) {
  if (method !== 'POST') return [405, { error: 'POST only' }];
  if (!isAuthorized(headers[WEBHOOK_KEY_HEADER])) return [403, { error: 'Forbidden' }];

  const events = suppressionEvents(body);
  for (const event of events) await recordSuppression(db, event);
  return [200, { status: events.length > 0 ? 'suppressed' : 'ignored', count: events.length }];
}

module.exports = {
  WEBHOOK_KEY_HEADER,
  handleWebhook,
  suppressionEvents,
};
