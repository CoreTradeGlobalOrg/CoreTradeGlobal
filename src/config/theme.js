/**
 * Centralized theme configuration
 * Clean minimal design with cream background and black text
 */

export const theme = {
  colors: {
    background: 'bg-[#0F1B2B]', // Deep Navy
    card: 'bg-[#1A283B]', // Accent Navy
    text: {
      primary: 'text-[#F5F5F5]', // White
      secondary: 'text-[#A0A0A0]', // Grey
      tertiary: 'text-gray-400',
      muted: 'text-gray-500',
    },
    border: {
      default: 'border-white/10',
      focus: 'focus:border-[#FFD700]', // Gold
    },
    button: {
      primary: 'bg-[#FFD700] hover:bg-[#FFD700] text-[#0F1B2B]', // Gold bg, Navy text
      ring: 'focus:ring-[#FFD700]',
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