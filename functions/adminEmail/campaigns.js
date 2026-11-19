/**
 * Admin email campaigns (.planning/ADMIN_EMAIL_PLAN.md, Phase 2).
 *
 * createEmailCampaign resolves the recipients (selected members + CSV rows),
 * drops everyone who must not get the email, snapshots the template and writes
 *   emailCampaigns/{id}
 *   emailCampaigns/{id}/recipients/{emailHash}
 * then enqueues one Cloud Task per BATCH_SIZE recipients. The task queue runs
 * one batch at a time, so sending is throttled and a bad list shows up in the
 * failure count while it is still small.
 *
 * Recipient status: pending → sending → sent | failed | skipped, or
 * excluded at creation. "sending" is claimed in a transaction before the
 * provider call, so a retried task never sends the same email twice.
 */

const crypto = require('crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');
const { trySendEmail } = require('../emailClient');
const {
  UNSUBSCRIBE_VARIABLE,
  findVariables,
  listUnsubscribeHeaders,
  renderTemplate,
  sanitizeVars,
  unsubscribeLink,
} = require('./render');

const BATCH_SIZE = 50;
const MAX_RECIPIENTS = 10000;
const DAILY_CAP_DEFAULT = 2000;
const READ_CHUNK = 300;
// Re-check pause/cancel and refresh the progress counters this often.
const CHECK_EVERY = 10;

const TASK_FUNCTION = 'sendEmailCampaignBatch';

// Same check as /api/unsubscribe.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

/** Doc id shared with `unsubscribes` (see /api/unsubscribe) and `emailSuppressions`. */
function emailHash(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function dailyCap() {
  const n = Number(process.env.ADMIN_EMAIL_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? n : DAILY_CAP_DEFAULT;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function nonEmpty(vars) {
  return Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== ''));
}

/** Why a registered account must never get admin email, or null. */
function accountExclusion(user) {
  if (user.role === 'admin') return 'admin';
  if (user.isDeleted) return user.deletionType === 'admin_ban' ? 'banned' : 'deleted';
  if (user.isSuspended) return 'suspended';
  return null;
}

function memberVars(user, email) {
  return sanitizeVars({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    companyName: user.companyName || '',
    email,
  });
}

async function loadUsers(db) {
  const snap = await db
    .collection('users')
    .select('email', 'firstName', 'lastName', 'companyName', 'role', 'isDeleted', 'deletionType', 'isSuspended')
    .get();
  const byUid = new Map();
  const byEmail = new Map();
  snap.forEach((doc) => {
    const user = { uid: doc.id, ...doc.data() };
    byUid.set(doc.id, user);
    const email = normalizeEmail(user.email);
    if (email) byEmail.set(email, user);
  });
  return { byUid, byEmail };
}

/** emailHash → 'unsubscribed' | 'bounced' for the hashes that must not be emailed. */
async function findSuppressed(db, hashes) {
  const reasons = new Map();
  for (const ids of chunk(hashes, READ_CHUNK)) {
    const [unsubscribed, bounced] = await Promise.all([
      db.getAll(...ids.map((id) => db.collection('unsubscribes').doc(id))),
      db.getAll(...ids.map((id) => db.collection('emailSuppressions').doc(id))),
    ]);
    unsubscribed.forEach((snap) => snap.exists && reasons.set(snap.id, 'unsubscribed'));
    bounced.forEach((snap) => snap.exists && !reasons.has(snap.id) && reasons.set(snap.id, 'bounced'));
  }
  return reasons;
}

async function suppressionReason(db, hash) {
  const [unsubscribed, bounced] = await Promise.all([
    db.collection('unsubscribes').doc(hash).get(),
    db.collection('emailSuppressions').doc(hash).get(),
  ]);
  if (unsubscribed.exists) return 'unsubscribed';
  if (bounced.exists) return 'bounced';
  return null;
}

/** Emails counted against the daily cap: queued in the last 24 h, minus what a cancel stopped. */
async function usedInLast24h(db) {
  const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const snap = await db.collection('emailCampaigns').where('createdAt', '>=', since).select('status', 'counts').get();
  let used = 0;
  snap.forEach((doc) => {
    const { status, counts = {} } = doc.data();
    used += status === 'cancelled' ? (counts.sent || 0) + (counts.failed || 0) : counts.recipients || 0;
  });
  return used;
}

/**
 * Work out who gets the email. Nothing is written.
 * @param {string[]} uids selected members
 * @param {{email: string, vars?: object}[]} csvRows
 */
async function planCampaign(db, { uids, csvRows, subject, html }) {
  const { byUid, byEmail } = await loadUsers(db);
  const recipients = new Map(); // emailHash → { email, uid, vars, source }
  const excluded = new Map(); // emailHash → { email, uid, reason }
  const counts = { invalid: 0, duplicate: 0, memberNotFound: 0, csvMatchedMembers: 0 };

  function add(email, user, vars, source) {
    const hash = emailHash(email);
    const existing = recipients.get(hash);
    if (existing || excluded.has(hash)) {
      // Picked twice (a member who is also in the CSV, or a repeated CSV row): one email.
      if (existing) existing.vars = { ...existing.vars, ...vars };
      counts.duplicate += 1;
      return;
    }
    const reason = user ? accountExclusion(user) : null;
    if (reason) excluded.set(hash, { email, uid: user.uid, reason });
    else recipients.set(hash, { email, uid: user?.uid || null, vars, source });
  }

  for (const uid of uids) {
    const user = byUid.get(uid);
    if (!user) {
      counts.memberNotFound += 1;
      continue;
    }
    const email = normalizeEmail(user.email);
    if (!isValidEmail(email)) {
      counts.invalid += 1;
      continue;
    }
    add(email, user, memberVars(user, email), 'member');
  }

  for (const row of csvRows) {
    const email = normalizeEmail(row?.email);
    if (!isValidEmail(email)) {
      counts.invalid += 1;
      continue;
    }
    // A CSV address that belongs to an account gets the account's name unless the CSV has one.
    const user = byEmail.get(email) || null;
    if (user) counts.csvMatchedMembers += 1;
    const vars = { ...(user ? memberVars(user, email) : {}), ...nonEmpty(sanitizeVars(row?.vars)), email };
    add(email, user, vars, 'csv');
  }

  const suppressed = await findSuppressed(db, [...recipients.keys()]);
  for (const [hash, reason] of suppressed) {
    const r = recipients.get(hash);
    recipients.delete(hash);
    excluded.set(hash, { email: r.email, uid: r.uid, reason });
  }

  const excludedByReason = {};
  for (const { reason } of excluded.values()) excludedByReason[reason] = (excludedByReason[reason] || 0) + 1;

  // Variables the template uses that would render empty for some recipients.
  const emptyVariables = {};
  for (const name of findVariables(subject, html)) {
    if (name === UNSUBSCRIBE_VARIABLE) continue;
    let empty = 0;
    for (const r of recipients.values()) if (!r.vars[name]) empty += 1;
    if (empty > 0) emptyVariables[name] = empty;
  }

  const cap = dailyCap();
  const used = await usedInLast24h(db);

  return {
    recipients,
    excluded,
    summary: {
      selectedMembers: uids.length,
      csvRows: csvRows.length,
      toSend: recipients.size,
      ...counts,
      excluded: excludedByReason,
      emptyVariables,
      dailyCap: cap,
      remainingToday: Math.max(0, cap - used),
    },
  };
}

/** Write the campaign and its recipients. Returns the campaign id and batch count. */
async function writeCampaign(db, { plan, template, sender, name, sources, createdBy }) {
  const ref = db.collection('emailCampaigns').doc();
  const recipients = [...plan.recipients.entries()];
  const batches = Math.ceil(recipients.length / BATCH_SIZE);

  await ref.set({
    name,
    templateId: template.id,
    templateName: template.name || '',
    subject: template.subject,
    html: template.html,
    sender,
    status: 'queued',
    counts: { recipients: recipients.length, sent: 0, failed: 0, skipped: 0, pending: recipients.length },
    excluded: plan.summary.excluded,
    invalid: plan.summary.invalid,
    duplicate: plan.summary.duplicate,
    sources,
    batches,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
  });

  const writer = db.bulkWriter();
  const recipientsRef = ref.collection('recipients');
  recipients.forEach(([hash, r], i) => {
    writer.set(recipientsRef.doc(hash), {
      email: r.email,
      uid: r.uid,
      vars: r.vars,
      source: r.source,
      status: 'pending',
      batch: Math.floor(i / BATCH_SIZE),
    });
  });
  for (const [hash, x] of plan.excluded) {
    writer.set(recipientsRef.doc(hash), { email: x.email, uid: x.uid || null, status: 'excluded', reason: x.reason });
  }
  await writer.close();

  return { campaignId: ref.id, batches };
}

async function enqueueBatches(campaignId, batchNumbers) {
  const queue = getFunctions().taskQueue(TASK_FUNCTION);
  for (const group of chunk(batchNumbers, 20)) {
    await Promise.all(group.map((batch) => queue.enqueue({ campaignId, batch }, { dispatchDeadlineSeconds: 600 })));
  }
}

/**
 * Recount recipients by status, store the counts and finish the campaign once
 * nothing is left to send. Returns the campaign status after the update.
 */
async function syncCampaign(db, campaignRef) {
  const recipientsRef = campaignRef.collection('recipients');
  const statuses = ['sent', 'failed', 'skipped', 'pending', 'sending'];
  const totals = await Promise.all(
    statuses.map((s) => recipientsRef.where('status', '==', s).count().get().then((snap) => snap.data().count))
  );
  const counts = Object.fromEntries(statuses.map((s, i) => [s, totals[i]]));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(campaignRef);
    if (!snap.exists) return null;
    const { status } = snap.data();
    const update = {
      'counts.sent': counts.sent,
      'counts.failed': counts.failed,
      'counts.skipped': counts.skipped,
      'counts.pending': counts.pending + counts.sending,
    };
    let next = status;
    if (status === 'sending' && counts.pending === 0 && counts.sending === 0) {
      next = 'completed';
      update.status = next;
      update.completedAt = FieldValue.serverTimestamp();
    }
    tx.update(campaignRef, update);
    return next;
  });
}

/** Body of the sendEmailCampaignBatch task. */
async function sendCampaignBatch(db, { campaignId, batch }) {
  const campaignRef = db.collection('emailCampaigns').doc(campaignId);

  const campaign = await db.runTransaction(async (tx) => {
    const snap = await tx.get(campaignRef);
    if (!snap.exists) return null;
    const data = snap.data();
    if (data.status === 'queued') {
      tx.update(campaignRef, {
        status: 'sending',
        ...(data.startedAt ? {} : { startedAt: FieldValue.serverTimestamp() }),
      });
    } else if (data.status !== 'sending') {
      return null; // paused, cancelled or completed
    }
    return data;
  });
  if (!campaign) return;

  // At most BATCH_SIZE docs; filtering status here avoids a composite index.
  const snap = await campaignRef.collection('recipients').where('batch', '==', batch).get();
  const todo = snap.docs.filter((d) => ['pending', 'sending'].includes(d.get('status')));

  let done = 0;
  for (const doc of todo) {
    if (done > 0 && done % CHECK_EVERY === 0 && (await syncCampaign(db, campaignRef)) !== 'sending') return;
    done += 1;

    if (doc.data().status === 'sending') {
      // An earlier attempt of this task stopped between claiming and recording
      // this recipient. The email may have gone out, so it is never retried.
      await doc.ref.update({ status: 'failed', error: 'Interrupted while sending; it may or may not have been delivered.' });
      continue;
    }

    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (fresh.data()?.status !== 'pending') return null;
      tx.update(doc.ref, { status: 'sending' });
      return fresh.data();
    });
    if (!claimed) continue;

    // The address may have unsubscribed or bounced since the campaign was created.
    const reason = await suppressionReason(db, doc.id);
    if (reason) {
      await doc.ref.update({ status: 'skipped', reason });
      continue;
    }

    const vars = { ...claimed.vars, [UNSUBSCRIBE_VARIABLE]: unsubscribeLink(claimed.email, campaignId) };
    const { ok, error } = await trySendEmail({
      to: claimed.email,
      subject: renderTemplate(campaign.subject, vars, { escape: false }),
      html: renderTemplate(campaign.html, vars, { escape: true }),
      from: { address: campaign.sender.address, name: campaign.sender.name },
      replyTo: campaign.sender.replyTo,
      headers: listUnsubscribeHeaders(claimed.email, campaignId),
      clientReference: `${campaignId}:${doc.id}`,
      tag: TASK_FUNCTION,
    });
    await doc.ref.update(
      ok
        ? { status: 'sent', sentAt: FieldValue.serverTimestamp() }
        : { status: 'failed', error: String(error || 'Unknown error').slice(0, 500), failedAt: FieldValue.serverTimestamp() }
    );
  }

  await syncCampaign(db, campaignRef);
}

/** Batches that still have pending recipients, for Resume. */
async function pendingBatches(campaignRef) {
  const snap = await campaignRef.collection('recipients').where('status', '==', 'pending').select('batch').get();
  return [...new Set(snap.docs.map((d) => d.get('batch')))].sort((a, b) => a - b);
}

module.exports = {
  MAX_RECIPIENTS,
  enqueueBatches,
  pendingBatches,
  planCampaign,
  sendCampaignBatch,
  syncCampaign,
  writeCampaign,
};
