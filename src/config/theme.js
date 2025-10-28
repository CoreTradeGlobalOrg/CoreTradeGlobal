/**
 * Centralized theme configuration
 * Clean minimal design with cream background and black text
 */

export const theme = {
  colors: {
    background: 'bg-[#FDF7E5]', // Your cream color
    card: 'bg-white',
    text: {
      primary: 'text-black',
      secondary: 'text-gray-800',
      tertiary: 'text-gray-600',
      muted: 'text-gray-500',
    },
    border: {
      default: 'border-gray-200',
      focus: 'focus:border-black',
    },
    button: {
      primary: 'bg-black hover:bg-gray-800',
      ring: 'focus:ring-gray-400',
    },
  },
  
  spacing: {
    container: 'p-8 md:p-12',
    section: 'mb-8',
    input: 'px-6 py-4',
    button: 'px-8 py-4',
  },
  
  borderRadius: {
    card: 'rounded-3xl',
    input: 'rounded-xl',
    button: 'rounded-xl',
    message: 'rounded-xl',
  },
  
  shadow: {
    card: 'shadow-2xl',
    button: 'shadow-lg',
  },
  
  transitions: {
    default: 'transition-all duration-300',
    colors: 'transition-colors duration-200',
  },
};

export default theme;