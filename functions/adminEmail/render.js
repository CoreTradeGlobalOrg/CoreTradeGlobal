/**
 * Admin email tool helpers (.planning/ADMIN_EMAIL_PLAN.md).
 *
 * Template rendering must stay in sync with the admin preview in
 * src/lib/email/adminEmailTemplate.js — the preview is only trustworthy if
 * both sides replace variables the same way.
 */

// {{firstName}}, {{ companyName }} …
const VARIABLE_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const VARIABLE_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

const MAX_VARS = 50;
const MAX_VAR_LENGTH = 1000;

const ALLOWED_FROM_DOMAINS_DEFAULT = 'coretradeglobal.com';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replace {{variables}} with values. Unknown variables render empty.
 * @param {string} text
 * @param {Object<string,string>} vars
 * @param {{ escape: boolean }} opts escape=true for HTML bodies, false for subjects
 */
function renderTemplate(text, vars, { escape }) {
  return String(text || '').replace(VARIABLE_RE, (_, key) => {
    const value = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    return escape ? escapeHtml(value) : String(value);
  });
}

/**
 * Keep only string values under safe keys; anything else from the client is dropped.
 */
function sanitizeVars(vars) {
  const clean = {};
  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return clean;
  for (const [key, value] of Object.entries(vars).slice(0, MAX_VARS)) {
    if (!VARIABLE_KEY_RE.test(key)) continue;
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    clean[key] = String(value).slice(0, MAX_VAR_LENGTH);
  }
  return clean;
}

function allowedFromDomains() {
  return (process.env.EMAIL_ALLOWED_FROM_DOMAINS || ALLOWED_FROM_DOMAINS_DEFAULT)
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedFromAddress(address) {
  if (typeof address !== 'string') return false;
  const match = /^[^\s@]+@([^\s@]+)$/.exec(address.trim().toLowerCase());
  return !!match && allowedFromDomains().includes(match[1]);
}

/**
 * Load an admin-managed sender and check it may be used.
 * @returns {Promise<{ sender?: {address, name, replyTo}, error?: string }>}
 */
async function loadSender(db, senderId) {
  if (typeof senderId !== 'string' || !senderId) return { error: 'Choose a sender.' };

  const snap = await db.collection('emailSenders').doc(senderId).get();
  if (!snap.exists) return { error: 'Sender not found.' };

  const data = snap.data();
  if (data.active === false) return { error: `${data.address} is disabled.` };
  if (!isAllowedFromAddress(data.address)) {
    return { error: `${data.address} is not on an allowed sending domain.` };
  }

  return {
    sender: {
      address: data.address.trim().toLowerCase(),
      name: data.displayName || undefined,
      replyTo: data.replyTo || undefined,
    },
  };
}

module.exports = {
  escapeHtml,
  renderTemplate,
  sanitizeVars,
  isAllowedFromAddress,
  loadSender,
};
