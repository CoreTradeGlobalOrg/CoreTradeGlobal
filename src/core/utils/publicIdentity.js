/**
 * Public name/company for a user profile.
 *
 * Accounts created by a guest RFQ (source 'guest_rfq') start without a
 * name or company. Until the owner sets them once (identitySetAt), they
 * show as "Buyer" / "Anonymous" everywhere, so nothing derived from the
 * email address leaks onto public pages.
 */

export const ANONYMOUS_BUYER_NAME = 'Buyer';
export const ANONYMOUS_COMPANY_NAME = 'Anonymous';

export function isAnonymousGuest(user) {
  return user?.source === 'guest_rfq' && !user?.identitySetAt;
}

export function publicDisplayName(user, fallback = 'User') {
  if (isAnonymousGuest(user)) return ANONYMOUS_BUYER_NAME;
  return user?.displayName || fallback;
}

export function publicCompanyName(user, fallback = 'No company') {
  if (isAnonymousGuest(user)) return ANONYMOUS_COMPANY_NAME;
  return user?.companyName || fallback;
}
