/**
 * Card Component
 * Reusable card container with consistent styling
 */

import { theme } from '@/config/theme';

export function Card({ children, className = '' }) {
  return (
    <div 
      className={`
        ${theme.colors.card}
        ${theme.borderRadius.card}
        ${theme.shadow.card}
        ${theme.spacing.container}
        border ${theme.colors.border.default}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Card;