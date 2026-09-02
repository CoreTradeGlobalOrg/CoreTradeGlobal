/**
 * Workflow email template builders — WF1..WF6.
 *
 * Each exported function returns { subject, preheader, htmlBody }
 * given a `ctx` bag of contact fields. The HTML string is already
 * wrapped in buildBrandedEmailHtml so consumers just pass it to
 * sendDealEmail (or the workflow dispatcher).
 *
 * Source drafts live in other_items/hubspot_email_templates/. Keep
 * the copy in sync when a marketing hand tweaks a template — this
 * is the runtime source of truth.
 */

const APP_URL = process.env.APP_URL || 'https://coretradeglobal.com';

/**
 * Guard against undefined ctx.firstName / ctx.companyName leaking
 * "undefined" into an email body. Mirrors HubSpot's | default:"there".
 */
function pick(value, fallback) {
  const v = (value || '').toString().trim();
  return v || fallback;
}

function ctaButton(label, url) {
  return `
    <div style="margin: 24px 0;">
      <a href="${url}"
         style="display:inline-block;background:linear-gradient(135deg,#FFD700 0%,#FDB931 100%);color:#0F1B2B;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;">
        ${label}
      </a>
    </div>
  `;
}

function paragraph(text) {
  return `<p style="margin: 0 0 14px 0; line-height: 1.6;">${text}</p>`;
}

// ─────────────────────────────────────────────────────────────────
// WF1 — Form Abandonment Recovery
// ─────────────────────────────────────────────────────────────────

function wf1_1_formAbandonmentFirst({ firstName }) {
  const name = pick(firstName, 'there');
  const url = `${APP_URL}/register`;
  return {
    subject: 'Finish signing up on CoreTradeGlobal',
    preheader: 'Your account is only a few clicks away.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        'It looks like you started creating your CoreTradeGlobal account but did not complete registration. Your details are still saved — pick up right where you left off.',
      ),
      paragraph(
        'CoreTradeGlobal is a B2B trade ecosystem connecting exporters, importers and international companies on a single digital platform. Complete your registration to start connecting.',
      ),
      ctaButton('Finish sign-up', url),
    ].join(''),
  };
}

function wf1_2_formAbandonmentSecond({ firstName }) {
  const name = pick(firstName, 'there');
  const url = `${APP_URL}/register`;
  return {
    subject: 'Still interested in CoreTradeGlobal?',
    preheader: 'One quick step is all that stands between you and thousands of B2B contacts.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        'A quick reminder that your CoreTradeGlobal registration is still incomplete. Members on the platform are actively connecting, posting RFQs, and closing trade deals every day.',
      ),
      paragraph(
        'Finishing sign-up takes less than a minute. Once you are in, you can list products, browse verified suppliers, and message buyers directly.',
      ),
      ctaButton('Complete registration', url),
    ].join(''),
  };
}

// ─────────────────────────────────────────────────────────────────
// WF2 — Email Verification
// ─────────────────────────────────────────────────────────────────

function wf2_1_emailVerification({ firstName, magicLink }) {
  const name = pick(firstName, 'there');
  return {
    subject: 'Welcome to CoreTradeGlobal — sign in with one click',
    preheader: 'Your account is ready. Jump straight in — no password prompts.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph('Welcome to CoreTradeGlobal!'),
      paragraph(
        'Your account is ready. Click the button below to sign in — no password prompts, no verify link to hunt down. You will land straight on the platform.',
      ),
      ctaButton('Sign in to CoreTradeGlobal', magicLink || `${APP_URL}/login`),
    ].join(''),
  };
}

function wf2_2_verificationReminder({ firstName, magicLink }) {
  const name = pick(firstName, 'there');
  return {
    subject: 'One last step — verify your CoreTradeGlobal account',
    preheader: 'Sign in with one click and finish activating your account.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        'Your CoreTradeGlobal account is still pending verification. Members who verify unlock messaging, RFQ posting, and direct deals with international suppliers.',
      ),
      paragraph('Skip the password — sign in with a single click below.'),
      ctaButton('Sign in and verify', magicLink || `${APP_URL}/login`),
    ].join(''),
  };
}

// ─────────────────────────────────────────────────────────────────
// WF3 — Onboarding First Listing
// ─────────────────────────────────────────────────────────────────

function wf3_1_firstListing({ firstName, companyName }) {
  const name = pick(firstName, 'there');
  const company = pick(companyName, 'your company');
  const url = `${APP_URL}/product/bulk`;
  return {
    subject: 'Publish your first products on CoreTradeGlobal',
    preheader: 'Get discovered by buyers — add your first listing today.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        `Thanks for joining CoreTradeGlobal with ${company}. Members who list at least one product get 4× more buyer contacts in their first month.`,
      ),
      paragraph(
        'Use our bulk uploader to publish your entire catalogue in minutes — CSV in, live validation, publish. Or add products one at a time from your profile.',
      ),
      ctaButton('Upload my catalogue', url),
    ].join(''),
  };
}

function wf3_2_catalogSupport({ firstName }) {
  const name = pick(firstName, 'there');
  const url = `${APP_URL}/bulk-upload`;
  return {
    subject: 'Need a hand publishing your catalogue?',
    preheader: 'A quick guide, plus tips from members who publish 100+ products a week.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        'If you have a lot of products to list, our bulk uploader is the fastest way. Drop a CSV, we validate every row in the browser, and you attach photos per product before publishing.',
      ),
      paragraph(
        'Common questions we hear: What columns do I need? What image formats work? What if a row fails? All of these are answered in our short guide below.',
      ),
      ctaButton('Read the bulk upload guide', url),
    ].join(''),
  };
}

// ─────────────────────────────────────────────────────────────────
// WF4 — Profile Completion
// ─────────────────────────────────────────────────────────────────

function wf4_1_profileCompletion({ firstName, uid }) {
  const name = pick(firstName, 'there');
  const url = uid ? `${APP_URL}/profile/${uid}?highlight=incomplete` : `${APP_URL}/settings`;
  return {
    subject: 'Complete your CoreTradeGlobal profile',
    preheader: 'Verified profiles get 3× more messages from buyers and suppliers.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        'A complete company profile is the difference between "browsing" and "closing deals" on CoreTradeGlobal. Buyers filter by verified sellers with a company logo, description, and full contact details.',
      ),
      paragraph(
        'Adding your logo, company website, LinkedIn, and short description takes about 2 minutes. Missing fields on your profile are highlighted for you.',
      ),
      ctaButton('Complete my profile', url),
    ].join(''),
  };
}

// ─────────────────────────────────────────────────────────────────
// WF5 — Re-Engagement & Win-Back
// ─────────────────────────────────────────────────────────────────

function wf5_1_reengagement14d({ firstName, companyName }) {
  const name = pick(firstName, 'there');
  const company = pick(companyName, 'your company');
  const url = `${APP_URL}/products`;
  return {
    subject: 'What is new on CoreTradeGlobal',
    preheader: 'New products, new buyers, new RFQs — see what you have missed.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        `We noticed ${company} has not stopped by lately. Meanwhile, new products, new RFQs, and new members joined the platform — some of them likely in your category.`,
      ),
      paragraph(
        'A quick catch-up: browse the latest catalogue, or search for buyers in your industry.',
      ),
      ctaButton('See what is new', url),
    ].join(''),
  };
}

function wf5_2_winBack45d({ firstName, companyName, magicLink }) {
  const name = pick(firstName, 'there');
  const company = pick(companyName, 'your company');
  return {
    subject: 'Your account is still active, sign in with one click',
    preheader: 'Discover new products listed on CoreTradeGlobal and connect with new members.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        `Your CoreTradeGlobal account for ${company} is still active.`,
      ),
      paragraph(
        'While you were away, new products were listed on the platform and new companies joined our global B2B network.',
      ),
      paragraph('Here is what you can do today:'),
      paragraph(
        '• Explore the latest products and services listed across your industry.<br/>' +
          '• Connect directly with newly registered buyers, suppliers and logistics providers.<br/>' +
          '• Message trading partners without middlemen to collect new quotes.',
      ),
      paragraph('No need to remember your password. Click the button below to sign in directly.'),
      ctaButton('Sign in without password', magicLink || `${APP_URL}/login`),
    ].join(''),
  };
}

// ─────────────────────────────────────────────────────────────────
// WF6 — Sponsored Listing
// ─────────────────────────────────────────────────────────────────

function wf6_1_sponsoredListing({ firstName, companyName }) {
  const name = pick(firstName, 'there');
  const company = pick(companyName, 'your company');
  const url = `${APP_URL}/advertising`;
  return {
    subject: 'Get more eyes on your products — sponsored listings on CoreTradeGlobal',
    preheader: 'Feature your best products in front of thousands of qualified B2B buyers.',
    body: [
      paragraph(`Hi ${name},`),
      paragraph(
        `Your products from ${company} are live on CoreTradeGlobal. Members who sponsor their top listings see 5–8× more views and inquiries in the first week.`,
      ),
      paragraph('A sponsored listing gives your products premium placement — homepage carousel, category top rows, and search results.'),
      paragraph('Weekly packages start at competitive rates. Reach out and we will pick the best fit for your catalogue.'),
      ctaButton('See sponsorship options', url),
    ].join(''),
  };
}

// ─────────────────────────────────────────────────────────────────
// Registry — id → { builder, description, requiresMagicLink }
// ─────────────────────────────────────────────────────────────────

const WORKFLOW_EMAILS = {
  wf1_1: { build: wf1_1_formAbandonmentFirst, description: 'Form abandonment first reminder', requiresMagicLink: false },
  wf1_2: { build: wf1_2_formAbandonmentSecond, description: 'Form abandonment second reminder', requiresMagicLink: false },
  wf2_1: { build: wf2_1_emailVerification, description: 'Welcome + magic-link sign-in (immediate)', requiresMagicLink: true },
  wf2_2: { build: wf2_2_verificationReminder, description: 'Email verification reminder with magic link', requiresMagicLink: true },
  wf3_1: { build: wf3_1_firstListing, description: 'Onboarding — publish first products', requiresMagicLink: false },
  wf3_2: { build: wf3_2_catalogSupport, description: 'Catalog upload support', requiresMagicLink: false },
  wf4_1: { build: wf4_1_profileCompletion, description: 'Profile completion prompt', requiresMagicLink: false },
  wf5_1: { build: wf5_1_reengagement14d, description: 'Re-engagement 14d inactive', requiresMagicLink: false },
  wf5_2: { build: wf5_2_winBack45d, description: 'Win-back 45d inactive with magic link', requiresMagicLink: true },
  wf6_1: { build: wf6_1_sponsoredListing, description: 'Sponsored listing pitch', requiresMagicLink: false },
};

module.exports = {
  WORKFLOW_EMAILS,
  // Individual exports (handy for tests + selective use)
  wf1_1_formAbandonmentFirst,
  wf1_2_formAbandonmentSecond,
  wf2_1_emailVerification,
  wf2_2_verificationReminder,
  wf3_1_firstListing,
  wf3_2_catalogSupport,
  wf4_1_profileCompletion,
  wf5_1_reengagement14d,
  wf5_2_winBack45d,
  wf6_1_sponsoredListing,
};
