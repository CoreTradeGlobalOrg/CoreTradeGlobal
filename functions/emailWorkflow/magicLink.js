/**
 * Magic link helper for email-based sign-in.
 *
 * Wraps admin.auth().generateSignInWithEmailLink() and rewrites the
 * Firebase-issued __/auth/action URL to /onboarding, which is what
 * OnboardingWizard listens for (see src/presentation/.../OnboardingWizard.jsx).
 * Callers get back a ready-to-embed URL; nothing else to configure.
 */

const admin = require('firebase-admin');
const APP_URL = process.env.APP_URL || 'https://coretradeglobal.com';

const DEFAULT_ACTION_CODE_SETTINGS = {
  url: `${APP_URL}/onboarding`,
  handleCodeInApp: true,
};

/**
 * Build a magic-link URL for the given email.
 *
 * @param {string} email
 * @param {{ continuePath?: string }} [opts] — override the landing path
 * @returns {Promise<string>} ready-to-embed sign-in URL
 */
async function buildMagicLink(email, opts = {}) {
  const settings = { ...DEFAULT_ACTION_CODE_SETTINGS };
  if (opts.continuePath) {
    settings.url = `${APP_URL}${opts.continuePath}`;
  }
  const rawLink = await admin.auth().generateSignInWithEmailLink(email, settings);

  // Firebase issues links against __/auth/action; the app's OnboardingWizard
  // knows how to consume that flow on /onboarding, so rewrite the host
  // portion but preserve the query string (mode, oobCode, apiKey, lang).
  try {
    const parsed = new URL(rawLink);
    const params = new URLSearchParams();
    for (const key of ['mode', 'oobCode', 'apiKey', 'continueUrl', 'lang']) {
      const value = parsed.searchParams.get(key);
      if (value) params.set(key, value);
    }
    return `${APP_URL}/onboarding?${params.toString()}`;
  } catch (err) {
    console.warn('buildMagicLink: URL rewrite failed, returning raw link', err.message);
    return rawLink;
  }
}

module.exports = { buildMagicLink };
