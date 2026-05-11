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
  { value: 'trade', label: 'Supplier' },
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

export default COMPANY_TYPES;
