/**
 * RoleBadge Component
 *
 * Displays a color-coded role badge for any platform role.
 * Colors are defined in roles.js:
 *   member=blue, logistics_provider=green, insurance_provider=orange,
 *   lawyer=purple, admin=red
 *
 * Usage:
 *   <RoleBadge role={user.role} />
 *   <RoleBadge role="lawyer" size="md" />
 */

import { User, Truck, Shield, Scale, Crown } from 'lucide-react';
import { ROLE_CONFIG, ROLES } from '@/core/constants/roles';

const ROLE_ICONS = {
  [ROLES.MEMBER]: User,
  [ROLES.LOGISTICS_PROVIDER]: Truck,
  [ROLES.INSURANCE_PROVIDER]: Shield,
  [ROLES.LAWYER]: Scale,
  [ROLES.ADMIN]: Crown,
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
  lg: 'text-base px-4 py-1.5 gap-2',
};

const ICON_SIZE_CLASSES = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

/**
 * RoleBadge
 *
 * @param {string} role - Platform role string (e.g. 'member', 'lawyer')
 * @param {'sm'|'md'|'lg'} size - Badge size variant (default: 'sm')
 */
export function RoleBadge({ role, size = 'sm' }) {
  // Null/undefined fallback: treat as member
  const resolvedRole = role || ROLES.MEMBER;
  const config = ROLE_CONFIG[resolvedRole] || ROLE_CONFIG[ROLES.MEMBER];

  const { bg, text, border } = config.badge;
  const label = config.label;
  const Icon = ROLE_ICONS[resolvedRole] || User;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${text} ${border} ${SIZE_CLASSES[size] || SIZE_CLASSES.sm}`}
    >
      <Icon className={ICON_SIZE_CLASSES[size] || ICON_SIZE_CLASSES.sm} />
      {label}
    </span>
  );
}

export default RoleBadge;
