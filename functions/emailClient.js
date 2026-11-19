/**
 * Transactional email client for Cloud Functions.
 *
 * Every email the platform sends (welcome, invite, deal events, workflow
 * emails, announcements, admin alerts) goes through sendEmail(), which calls
 * the Zoho ZeptoMail REST API.
 *
 * Like hubspotClient, a missing config never throws: sendEmail() logs and
 * resolves false so the origin operation (registration, deal, invite) still
 * succeeds. API errors are logged and also resolve false.
 *
 * Env:
 *   ZEPTOMAIL_TOKEN    Send Mail Token from the ZeptoMail Mail Agent
 *                      (with or without the "Zoho-enczapikey " prefix)
 *   ZEPTOMAIL_API_URL  optional, defaults to the EU data center
 *   EMAIL_FROM_ADDRESS optional, defaults to noreply@coretradeglobal.com
 *   EMAIL_FROM_NAME    optional, defaults to CoreTradeGlobal
 */

// Hesap EU veri merkezinde (bounce CNAME cluster89.zeptomail.eu)
const ZEPTOMAIL_API_URL_DEFAULT = 'https://api.zeptomail.eu/v1.1/email';
const FROM_ADDRESS_DEFAULT = 'noreply@coretradeglobal.com';
const FROM_NAME_DEFAULT = 'CoreTradeGlobal';

function isConfigured() {
  return !!process.env.ZEPTOMAIL_TOKEN;
}

function fromParts(from) {
  if (from?.address) {
    return { address: from.address, name: from.name || process.env.EMAIL_FROM_NAME || FROM_NAME_DEFAULT };
  }
  return {
    address: process.env.EMAIL_FROM_ADDRESS || FROM_ADDRESS_DEFAULT,
    name: process.env.EMAIL_FROM_NAME || FROM_NAME_DEFAULT,
  };
}

function toList(to) {
  return (Array.isArray(to) ? to : [to]).filter(
    (e) => typeof e === 'string' && e.includes('@')
  );
}

async function sendViaZeptoMail({ to, subject, html, replyTo, from, headers, clientReference }) {
  const token = process.env.ZEPTOMAIL_TOKEN.trim().replace(/^Zoho-enczapikey\s+/i, '');
  const body = {
    from: fromParts(from),
    to: to.map((address) => ({ email_address: { address } })),
    subject,
    htmlbody: html,
  };
  if (replyTo) body.reply_to = [{ address: replyTo }];
  if (headers && Object.keys(headers).length > 0) body.mime_headers = headers;
  if (clientReference) body.client_reference = clientReference;

  const res = await fetch(process.env.ZEPTOMAIL_API_URL || ZEPTOMAIL_API_URL_DEFAULT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-enczapikey ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ZeptoMail ${res.status}: ${detail.slice(0, 500)}`);
  }
}

/**
 * Send one email and report why it failed. Never throws.
 * Same options as sendEmail().
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function trySendEmail({ to, subject, html, replyTo, from, headers, clientReference, tag = 'sendEmail' }) {
  const recipients = toList(to);
  if (recipients.length === 0 || !subject || !html) {
    return { ok: false, error: 'Missing recipient, subject or body.' };
  }

  if (!isConfigured()) {
    console.warn(`${tag}: ZEPTOMAIL_TOKEN not set, skipping email.`);
    return { ok: false, error: 'Email provider is not configured.' };
  }

  try {
    await sendViaZeptoMail({ to: recipients, subject, html, replyTo, from, headers, clientReference });
    console.log(`${tag}: sent "${subject}" to ${recipients.join(', ')}`);
    return { ok: true };
  } catch (err) {
    const error = err.message || String(err);
    console.error(`${tag}: failed to send "${subject}" to ${recipients.join(', ')}:`, error);
    return { ok: false, error };
  }
}

/**
 * Send one email. Never throws.
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.replyTo]
 * @param {{address: string, name?: string}} [opts.from] sender override; the
 *        caller must have checked it against the allowed senders. Defaults to
 *        EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME.
 * @param {Object<string,string>} [opts.headers] extra MIME headers, e.g. List-Unsubscribe
 * @param {string} [opts.clientReference] echoed back in ZeptoMail webhooks
 * @param {string} [opts.tag] log prefix, e.g. the calling function's name
 * @returns {Promise<boolean>} true when the provider accepted the message
 */
async function sendEmail(opts) {
  const { ok } = await trySendEmail(opts);
  return ok;
}

module.exports = {
  sendEmail,
  trySendEmail,
  isConfigured,
};
