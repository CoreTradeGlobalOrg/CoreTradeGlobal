/**
 * Input Component
 * Reusable input field with consistent styling
 */

export function Input({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  error = false,
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
        w-full
        px-4 py-3
        text-base
        bg-white
        border-2
        ${error
          ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
          : 'border-slate-300 focus:border-blue-600 focus:ring-blue-200'
        }
        rounded-lg
        text-slate-900
        placeholder:text-slate-400
        focus:outline-none
        focus:ring-4
        transition-all duration-200
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:bg-slate-50
        ${className}
      `}
      {...props}
    />
  );
}

export default Input;