/**
 * HubSpot client for Cloud Functions runtime.
 *
 * CommonJS port of src/lib/analytics/hubspotServer.js — same
 * rate-limit + retry + upsert behaviour, but importable from
 * Firebase functions (no ESM alias, no bundler).
 *
 * All helpers here are safe to call even when HUBSPOT_ACCESS_TOKEN
 * is missing — they no-op with a log so a partial config never
 * fails the origin operation (user registration, ad inquiry, deal).
 */

const HUBSPOT_API = 'https://api.hubapi.com';
const REQUEST_INTERVAL_MS = 350;
const RETRY_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const CTG_PROPS = {
  ctgUserId: 'ctg_user_id',
  companyType: 'company_type',
  role: 'role',
  verifiedStatus: 'verified_status',
  ctgRegistration: 'ctg_registration',
  lastPlatformLogin: 'last_platform_login',
  engagementScore: 'ctg_engagement_score',
  productsListed: 'products_listed',
  rfqsSent: 'rfqs_sent',
  ctgSegment: 'ctg_segment',
};

function isConfigured() {
  return !!process.env.HUBSPOT_ACCESS_TOKEN;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksLikeEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

async function hs(path, options = {}) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN missing');

  let lastErr = null;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    const res = await fetch(`${HUBSPOT_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (res.ok) return res.json();

    if (res.status === 404) {
      const body = await res.text().catch(() => '');
      const err = new Error(`HubSpot 404: ${body.slice(0, 200)}`);
      err.status = 404;
      throw err;
    }

    const retryable = res.status === 429 || res.status >= 500;
    const body = await res.text().catch(() => '');
    lastErr = new Error(`HubSpot ${res.status}: ${body.slice(0, 200)}`);
    lastErr.status = res.status;
    if (!retryable || attempt === RETRY_ATTEMPTS - 1) throw lastErr;

    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterMs = retryAfterHeader
      ? Math.min(30000, Number(retryAfterHeader) * 1000)
      : Math.min(15000, RETRY_BASE_DELAY_MS * 2 ** attempt);
    await sleep(retryAfterMs);
  }
  throw lastErr || new Error('HubSpot: max retries exceeded');
}

async function findContactByEmail(email, properties = ['email', 'hs_object_id']) {
  if (!email) return null;
  const data = await hs('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: 'email', operator: 'EQ', value: email.toLowerCase() }] },
      ],
      properties,
      limit: 1,
    }),
  });
  return data.results?.[0] || null;
}

function toUtcMidnightMs(input) {
  if (!input) return null;
  const d = input instanceof Date
    ? input
    : typeof input.toDate === 'function'
      ? input.toDate()
      : new Date(input);
  if (isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function buildContactPropertiesFromUser(user, extras = {}) {
  const props = {};
  const set = (k, v) => {
    if (v === null || v === undefined || v === '') return;
    props[k] = v;
  };

  const displayName = user.fullName || user.displayName || '';
  const [firstName, ...restName] = displayName.trim().split(/\s+/);
  const lastName = restName.join(' ');

  set('email', user.email);
  set('firstname', user.firstName || firstName || null);
  set('lastname', user.lastName || lastName || null);
  set('phone', user.phone);
  set('company', user.companyName);
  set('jobtitle', user.position);
  set('website', user.companyWebsite);
  set('country', user.country);

  set(CTG_PROPS.ctgUserId, user.uid);

  const roleMap = {
    member: 'Member',
    logistics_provider: 'Logistics Provider',
    insurance_provider: 'Insurance Provider',
    admin: 'Admin',
    lawyer: 'Lawyer',
  };
  if (user.role && roleMap[user.role]) set(CTG_PROPS.role, roleMap[user.role]);

  const companyTypeMap = {
    member: 'Trade',
    logistics_provider: 'Logistics',
    insurance_provider: 'Insurance',
  };
  if (companyTypeMap[user.role]) set(CTG_PROPS.companyType, companyTypeMap[user.role]);

  const verified = !!(user.emailVerified && user.adminApproved);
  set(CTG_PROPS.verifiedStatus, verified ? 'true' : 'false');

  const regMs = toUtcMidnightMs(user.createdAt);
  if (regMs != null) set(CTG_PROPS.ctgRegistration, String(regMs));

  const loginMs = toUtcMidnightMs(user.lastLoginAt);
  if (loginMs != null) set(CTG_PROPS.lastPlatformLogin, String(loginMs));

  if (extras.engagementScore != null) set(CTG_PROPS.engagementScore, extras.engagementScore);
  if (extras.productsCount != null) set(CTG_PROPS.productsListed, extras.productsCount);
  if (extras.rfqsCount != null) set(CTG_PROPS.rfqsSent, extras.rfqsCount);
  if (extras.segment) set(CTG_PROPS.ctgSegment, extras.segment);

  return props;
}

/**
 * Upsert a contact by email — PATCH if exists, POST if not.
 * Returns { hubspotId, created, skipped, reason }.
 */
async function upsertContact(user, extras = {}) {
  if (!user?.email) return { skipped: true, reason: 'missing_email' };
  const email = user.email.trim();
  if (!looksLikeEmail(email)) return { skipped: true, reason: 'invalid_email_shape', email };

  const properties = buildContactPropertiesFromUser({ ...user, email }, extras);

  try {
    const existing = await findContactByEmail(email);
    if (existing) {
      await hs(`/crm/v3/objects/contacts/${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      return { hubspotId: existing.id, created: false };
    }
    const created = await hs('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({ properties }),
    });
    return { hubspotId: created.id, created: true };
  } catch (err) {
    if (err?.status === 400 && /INVALID_EMAIL|invalid[\s_-]?email/i.test(err.message || '')) {
      return { skipped: true, reason: 'hubspot_rejected_email', email };
    }
    throw err;
  }
}

/**
 * Create a deal in HubSpot, associating to a contact by email if
 * one exists. Idempotency is the caller's responsibility — pass
 * existingDealId to PATCH instead of POST.
 */
async function upsertDeal({ dealId, dealname, amount, dealstage, pipeline = 'default', contactEmail, extraProps = {} }) {
  const properties = {
    dealname,
    dealstage,
    pipeline,
    ...extraProps,
  };
  if (amount != null && amount !== '') properties.amount = String(amount);

  if (dealId) {
    await hs(`/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
    return { hubspotId: dealId, created: false };
  }

  // Try to associate to a contact (V4 associations API).
  let associations = [];
  if (contactEmail) {
    const contact = await findContactByEmail(contactEmail);
    if (contact) {
      associations = [
        {
          to: { id: contact.id },
          // Contact-to-deal default association type id is 3.
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
        },
      ];
    }
  }

  const created = await hs('/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({ properties, associations }),
  });
  return { hubspotId: created.id, created: true };
}

module.exports = {
  isConfigured,
  looksLikeEmail,
  hs,
  findContactByEmail,
  upsertContact,
  upsertDeal,
  buildContactPropertiesFromUser,
  CTG_PROPS,
  sleep,
};
