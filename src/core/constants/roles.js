/**
 * Role Constants
 *
 * Defines the 5 platform roles and associated helpers.
 * Custom claims are the single source of truth for role enforcement
 * across middleware, Firestore rules, and session cookies.
 *
 * Role assignment:
 * - member: self-registration
 * - logistics_provider, insurance_provider, lawyer: admin invite only
 * - admin: bootstrapped (cannot be assigned via inviteUser)
 */

export const ROLES = {
  MEMBER: 'member',
  LOGISTICS_PROVIDER: 'logistics_provider',
  INSURANCE_PROVIDER: 'insurance_provider',
  LAWYER: 'lawyer',
  ADMIN: 'admin',
};

/**
 * All valid role string values
 */
export const ROLE_VALUES = Object.values(ROLES);

/**
 * Roles that can be assigned via the inviteUser Cloud Function.
 * Members self-register; admins are bootstrapped directly.
 */
export const VALID_INVITE_ROLES = [
  ROLES.LOGISTICS_PROVIDER,
  ROLES.INSURANCE_PROVIDER,
  ROLES.LAWYER,
];

/**
 * Display names for each role (shown in UI)
 */
export const ROLE_DISPLAY_NAMES = {
  [ROLES.MEMBER]: 'Member',
  [ROLES.LOGISTICS_PROVIDER]: 'Logistics Provider',
  [ROLES.INSURANCE_PROVIDER]: 'Insurance Provider',
  [ROLES.LAWYER]: 'Lawyer',
  [ROLES.ADMIN]: 'Admin',
};

/**
 * Badge color config per role
 * Colors use Tailwind CSS class names
 *
 * User decision: member=blue, logistics_provider=green,
 * insurance_provider=orange, lawyer=purple, admin=red
 */
export const ROLE_BADGE_COLORS = {
  [ROLES.MEMBER]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    color: 'blue',
  },
  [ROLES.LOGISTICS_PROVIDER]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    color: 'green',
  },
  [ROLES.INSURANCE_PROVIDER]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    color: 'orange',
  },
  [ROLES.LAWYER]: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    color: 'purple',
  },
  [ROLES.ADMIN]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    color: 'red',
  },
};

/**
 * Role configuration (display name + badge color combined)
 * Convenience object for UI components
 */
export const ROLE_CONFIG = Object.fromEntries(
  ROLE_VALUES.map((role) => [
    role,
    {
      value: role,
      label: ROLE_DISPLAY_NAMES[role],
      badge: ROLE_BADGE_COLORS[role],
    },
  ])
);

/**
 * Check if a string is a valid platform role
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  return ROLE_VALUES.includes(role);
}

/**
 * Check if a role can be assigned via the invite flow
 * (excludes 'member' and 'admin')
 * @param {string} role
 * @returns {boolean}
 */
export function isInviteableRole(role) {
  return VALID_INVITE_ROLES.includes(role);
}

const rolesConstants = {
  ROLES,
  ROLE_VALUES,
  VALID_INVITE_ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_BADGE_COLORS,
  ROLE_CONFIG,
  isValidRole,
  isInviteableRole,
};

export default rolesConstants;
