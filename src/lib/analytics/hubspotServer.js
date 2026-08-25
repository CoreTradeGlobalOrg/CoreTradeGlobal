/**
 * HubSpot server-only client — shared across every route under
 * /api/analytics/hubspot. Never import this from a Client Component;
 * the Private App token lives here.
 *
 * Rate-limit strategy:
 *   Free tier's search endpoint is 4 req/s across ALL private apps
 *   on the portal, with no burst forgiveness. Every helper here
 *   respects that: hs() retries 429 with Retry-After-aware backoff,
 *   runSerial() spaces requests 350 ms apart.
 */

export const HUBSPOT_API = 'https://api.hubapi.com';
export const REQUEST_INTERVAL_MS = 350;
export const RETRY_ATTEMPTS = 4;
export const RETRY_BASE_DELAY_MS = 1500;

/**
 * CTG custom-property internal names, discovered from the portal
 * via /crm/v3/properties/contacts. Keep in sync manually — the
 * portal's UI creates snake_case internal names from the label, but
 * if the label ever gets edited the internal name doesn't change.
 *
 * Options for enum fields:
 *   company_type: Trade | Logistics | Insurance
 *   role: Member | Logistics Provider | Insurance Provider | Admin | Lawyer
 *   ctg_segment: VIP | High-value Buyer | Passive Seller | Ad Potential |
 *                Churn | New Starter | Onboarded
 */
export const CTG_PROPS = {
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

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch a HubSpot endpoint with the Private App token. Retries on
 * 429 (rate limit) and 5xx (transient HubSpot outage) with an
 * exponential backoff — honours Retry-After when present.
 */
export async function hs(path, options = {}) {
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
      cache: 'no-store',
    });

    if (res.ok) return res.json();

    // 404 on a lookup is a real answer — don't retry, propagate.
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

/**
 * Run thunks strictly serial with a fixed gap. Keeps peak request
 * rate under HubSpot Free tier's 4 req/s search cap even when a
 * previous request returned quickly.
 */
export async function runSerial(tasks) {
  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await tasks[i]());
    if (i < tasks.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(REQUEST_INTERVAL_MS);
    }
  }
  return results;
}

/**
 * Look up a HubSpot contact by email. Returns { id, properties } or
 * null on 404.
 */
export async function findContactByEmail(email, properties = ['email', 'hs_object_id']) {
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
  const first = data.results?.[0];
  return first || null;
}

/**
 * Build the HubSpot properties payload for a Firestore user. Only
 * writes fields whose value is non-null so we don't clobber a HubSpot
 * value with an empty string from a partial user document.
 */
export function buildContactPropertiesFromUser(user, extras = {}) {
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

  // CTG custom fields.
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

  if (user.createdAt) {
    const d = user.createdAt instanceof Date
      ? user.createdAt
      : (typeof user.createdAt?.toDate === 'function' ? user.createdAt.toDate() : new Date(user.createdAt));
    // HubSpot date properties expect midnight UTC ms epoch for date-only fields.
    const midnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    set(CTG_PROPS.ctgRegistration, midnight.getTime().toString());
  }
  if (user.lastLoginAt) {
    const d = user.lastLoginAt instanceof Date
      ? user.lastLoginAt
      : (typeof user.lastLoginAt?.toDate === 'function' ? user.lastLoginAt.toDate() : new Date(user.lastLoginAt));
    const midnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    set(CTG_PROPS.lastPlatformLogin, midnight.getTime().toString());
  }

  // Extras — engagement score, products, rfqs, segment — passed by caller.
  if (extras.engagementScore != null) set(CTG_PROPS.engagementScore, extras.engagementScore);
  if (extras.productsCount != null) set(CTG_PROPS.productsListed, extras.productsCount);
  if (extras.rfqsCount != null) set(CTG_PROPS.rfqsSent, extras.rfqsCount);
  if (extras.segment) set(CTG_PROPS.ctgSegment, extras.segment);

  return props;
}

/**
 * Basic email shape check that mirrors HubSpot's own validator
 * closely enough to catch the common cases without a round-trip:
 * requires an @, a domain with at least one dot, and a TLD of at
 * least two letters. Not RFC-perfect on purpose — HubSpot's own
 * validator is stricter than the RFC too.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function looksLikeEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

/**
 * Upsert a contact — search by email, PATCH if exists, POST if not.
 * Returns { hubspotId, created, skipped, reason }.
 *
 * Throws only on unexpected HubSpot failures. Known "we can't push
 * this" cases (missing email, HubSpot-invalid email shape) return
 * { skipped: true, reason } so the caller can move on without
 * failing the whole bulk.
 */
export async function upsertContact(user, extras = {}) {
  if (!user?.email) {
    return { skipped: true, reason: 'missing_email' };
  }
  const email = user.email.trim();
  if (!looksLikeEmail(email)) {
    return { skipped: true, reason: 'invalid_email_shape', email };
  }

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
    // HubSpot returns 400 INVALID_EMAIL for TLDs its validator
    // doesn't recognise (.mb, .test, etc.). Treat as skipped, not
    // as an error — surfacing it as failure blocks bulk sync on
    // one bad row.
    const message = err?.message || '';
    if (err?.status === 400 && /INVALID_EMAIL|invalid[\s_-]?email/i.test(message)) {
      return { skipped: true, reason: 'hubspot_rejected_email', email };
    }
    throw err;
  }
}
