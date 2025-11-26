/**
 * Button Component
 * Reusable button with loading state and variants
 */

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
  const variants = {
    primary: `
      bg-blue-600 hover:bg-blue-700 active:bg-blue-800
      text-white
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-slate-100 hover:bg-slate-200 active:bg-slate-300
      text-slate-900
      shadow-sm
    `,
    outline: `
      bg-transparent hover:bg-slate-50 active:bg-slate-100
      text-blue-600 hover:text-blue-700
      border-2 border-blue-600 hover:border-blue-700
    `,
    danger: `
      bg-red-600 hover:bg-red-700 active:bg-red-800
      text-white
      shadow-sm hover:shadow-md
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={`
        px-6 py-3
        font-semibold
        rounded-lg
        focus:outline-none
        focus:ring-4 focus:ring-blue-200
        transition-all duration-200
        transform
        hover:scale-105
        active:scale-95
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:hover:scale-100
        ${variants[variant]}
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