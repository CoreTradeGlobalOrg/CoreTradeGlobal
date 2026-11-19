/**
 * Admin email tool — template helpers for the editor preview.
 *
 * renderTemplate must replace variables exactly like
 * functions/adminEmail/render.js, which renders the email that is actually
 * sent; otherwise the preview lies.
 */

const VARIABLE_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export const BUILT_IN_VARIABLES = ['firstName', 'lastName', 'companyName', 'email'];

// Filled in by the system for each recipient; the admin never types it.
export const UNSUBSCRIBE_VARIABLE = 'unsubscribe_link';

// Previews and test sends link to this address so clicking the link in a
// test email never unsubscribes a real person.
export const TEST_UNSUBSCRIBE_EMAIL = 'test@example.com';

/** Same URL as unsubscribeLink() in functions/adminEmail/render.js. */
export function unsubscribeLink(email, campaignId) {
  const query = `email=${encodeURIComponent(String(email).trim().toLowerCase())}&utm_source=admin-email`;
  return `https://www.coretradeglobal.com/unsubscribe?${
    campaignId ? `${query}&utm_campaign=${encodeURIComponent(campaignId)}` : query
  }`;
}

export const MAX_HTML_BYTES = 400 * 1024;

// Gmail clips messages over ~102 KB and hides the rest behind "View entire message".
const GMAIL_CLIP_BYTES = 100 * 1024;

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTemplate(text, vars, { escape }) {
  return String(text || '').replace(VARIABLE_RE, (_, key) => {
    const value = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    return escape ? escapeHtml(value) : String(value);
  });
}

/** Variable names used in the given texts, in first-seen order. */
export function findVariables(...texts) {
  const seen = new Set();
  for (const text of texts) {
    for (const match of String(text || '').matchAll(VARIABLE_RE)) seen.add(match[1]);
  }
  return [...seen];
}

export function byteSize(text) {
  return new TextEncoder().encode(text || '').length;
}

function formatKb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Problems that make an email render badly or not at all in mail clients.
 * @returns {{ level: 'error' | 'warning', message: string }[]}
 */
export function lintTemplate({ subject, html }) {
  const issues = [];
  const body = html || '';

  if (!subject?.trim()) issues.push({ level: 'error', message: 'Subject is empty.' });
  if (!body.trim()) issues.push({ level: 'error', message: 'HTML is empty.' });

  const size = byteSize(body);
  if (size > MAX_HTML_BYTES) {
    issues.push({ level: 'error', message: `HTML is ${formatKb(size)}; the limit is ${formatKb(MAX_HTML_BYTES)}.` });
  } else if (size > GMAIL_CLIP_BYTES) {
    issues.push({ level: 'warning', message: `HTML is ${formatKb(size)}. Gmail clips emails over about 100 KB.` });
  }

  if (/<script\b/i.test(body)) {
    issues.push({ level: 'warning', message: 'Contains <script>. Mail clients remove scripts; they will not run.' });
  }

  const srcs = [...body.matchAll(/\ssrc\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1].trim());
  if (srcs.some((src) => /^data:/i.test(src))) {
    issues.push({ level: 'warning', message: 'Embedded data: images are blocked by Gmail and Outlook. Host the image and use an https:// URL.' });
  }
  if (srcs.some((src) => src && !/^(https:|data:|cid:|\{\{)/i.test(src))) {
    issues.push({ level: 'warning', message: 'Some images do not use an absolute https:// URL and will not load.' });
  }

  const hrefs = [...body.matchAll(/\shref\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1].trim());
  if (hrefs.some((href) => href && !/^(https?:|mailto:|tel:|#|\{\{)/i.test(href))) {
    issues.push({ level: 'warning', message: 'Some links are relative. Use absolute URLs such as https://www.coretradeglobal.com/...' });
  }

  const used = findVariables(subject, body);
  if (body.trim() && !used.includes(UNSUBSCRIBE_VARIABLE)) {
    issues.push({
      level: 'warning',
      message: `No unsubscribe link. Add <a href="{{${UNSUBSCRIBE_VARIABLE}}}">Unsubscribe</a> to the footer.`,
    });
  }

  const custom = used.filter((v) => !BUILT_IN_VARIABLES.includes(v) && v !== UNSUBSCRIBE_VARIABLE);
  if (custom.length > 0) {
    issues.push({
      level: 'warning',
      message: `Custom variables (${custom.map((v) => `{{${v}}}`).join(', ')}) render empty unless the recipient CSV has a column with that name.`,
    });
  }

  return issues;
}
