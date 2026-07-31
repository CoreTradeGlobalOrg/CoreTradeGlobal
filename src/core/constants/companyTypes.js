/**
 * Company Types Constants
 *
 * Defines the company types available during self-registration and
 * maps each type to the platform role it grants on registration.
 *
 * - trade: standard member role (default)
 * - logistics: auto-assigned logistics_provider role via setRoleClaimOnRegistration CF
 * - insurance: auto-assigned insurance_provider role via setRoleClaimOnRegistration CF
 */

export const COMPANY_TYPES = [
  { value: 'trade', label: 'Trade Company' },
  { value: 'logistics', label: 'Logistics Company' },
  { value: 'insurance', label: 'Insurance Company' },
];

/**
 * Maps company type value to platform role string.
 * Members get 'member' by default; providers get their respective role.
 */
export const COMPANY_TYPE_TO_ROLE = {
  trade: 'member',
  logistics: 'logistics_provider',
  insurance: 'insurance_provider',
};

/**
 * Display labels for every value that can appear in `user.companyType`.
 * Kept separate from COMPANY_TYPES (which is only the sign-up dropdown
 * source) so `admin` and `lawyer` — which the sign-up flow never
 * offers — still render as friendly labels on the profile card
 * instead of falling through to "Not set".
 */
export const COMPANY_TYPE_LABELS = {
  trade: 'Trade Company',
  logistics: 'Logistics Company',
  insurance: 'Insurance Company',
  admin: 'Admin',
  lawyer: 'Lawyer',
};

/**
 * Reverse of COMPANY_TYPE_TO_ROLE, plus the fixed admin/lawyer values
 * per user request. Used by the backfill script to derive the missing
 * companyType from the role that IS present on every existing user
 * document. Trade is the only company type that maps to the generic
 * 'member' role, so member → trade is safe.
 */
export const ROLE_TO_COMPANY_TYPE = {
  member: 'trade',
  logistics_provider: 'logistics',
  insurance_provider: 'insurance',
  admin: 'admin',
  lawyer: 'lawyer',
};

export default COMPANY_TYPES;
