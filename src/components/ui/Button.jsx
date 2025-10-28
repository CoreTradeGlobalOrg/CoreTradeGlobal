/**
 * Button Component
 * Reusable button with loading state and variants
 */

import { theme } from '@/config/theme';

export function Button({ 
  children,
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  ariaLabel,
  ...props
}) {
//   const variants = {
//     primary: `
//       text-white
//       ${theme.colors.button.primary}
//       ${theme.shadow.button}
//     `,
//     secondary: 'text-warmBrown-800 bg-cream-dark hover:bg-cream',
//     outline: 'text-warmBrown-600 border-2 border-warmBrown-500 hover:bg-warmBrown-50',
//   };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={`
        ${theme.spacing.button}
        text-lg
        font-semibold
        ${theme.borderRadius.button}
        focus:outline-none
        focus:ring-4
        ${theme.colors.button.ring}
        ${theme.transitions.default}
        transform
        hover:scale-105
        active:scale-95
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:hover:scale-100
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg 
            className="animate-spin h-5 w-5" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;