/**
 * Input Component
 * Reusable input field with consistent styling
 */

import { theme } from '@/config/theme';

export function Input({ 
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  className = '',
  ariaLabel,
  ...props
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel || placeholder}
      className={`
        shared-input
        flex-1
        ${theme.spacing.input}
        text-lg
        border-2 ${theme.colors.border.default}
        ${theme.borderRadius.input}
        ${theme.colors.border.focus}
        focus:outline-none
        ${theme.transitions.colors}
        bg-cream-light
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  );
}

export default Input;