/**
 * Homepage Theme Configuration
 *
 * Dark theme color palette and styling for the homepage
 */

export const homepageTheme = {
  colors: {
    // Background colors
    background: {
      primary: '#18202a',      // Deep navy - main background
      secondary: '#1f2937',    // Slightly lighter - cards
      tertiary: '#111827',     // Darker - footer, overlays
      gradient: 'linear-gradient(180deg, #18202a 0%, #111827 100%)',
    },

    // Accent colors
    accent: {
      gold: '#FFD700',         // Primary gold
      goldLight: '#FFD700',    // Bright gold
      goldDark: '#B8860B',     // Dark gold
      goldGradient: 'linear-gradient(135deg, #FFD700 0%, #FFD700 50%, #FFD700 100%)',
    },

    // Text colors
    text: {
      primary: '#F5F5F5',      // White text
      secondary: '#D1D5DB',    // Light gray
      muted: '#9CA3AF',        // Muted gray
      dark: '#6B7280',         // Darker gray
      accent: '#FFD700',       // Gold text
    },

    // UI element colors
    ui: {
      border: 'rgba(255, 255, 255, 0.1)',
      borderHover: 'rgba(255, 255, 255, 0.2)',
      cardBg: 'rgba(31, 41, 55, 0.8)',
      cardBgHover: 'rgba(31, 41, 55, 0.95)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      blurOverlay: 'rgba(24, 32, 42, 0.95)',
    },

    // Status colors
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },

  // Glassmorphism effects
  glass: {
    background: 'rgba(31, 41, 55, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropBlur: 'blur(12px)',
    shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },

  // Card styles
  card: {
    background: 'rgba(31, 41, 55, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    shadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
    hoverShadow: '0 8px 40px rgba(255, 215, 0, 0.15)',
  },

  // Button styles
  button: {
    primary: {
      background: 'linear-gradient(135deg, #FFD700 0%, #FFD700 100%)',
      text: '#18202a',
      hover: 'linear-gradient(135deg, #FFD700 0%, #FFD700 100%)',
    },
    secondary: {
      background: 'transparent',
      border: '2px solid #FFD700',
      text: '#FFD700',
      hover: 'rgba(255, 215, 0, 0.1)',
    },
    ghost: {
      background: 'transparent',
      text: '#F5F5F5',
      hover: 'rgba(255, 255, 255, 0.1)',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    fontSize: {
      hero: '4rem',
      h1: '3rem',
      h2: '2.25rem',
      h3: '1.5rem',
      body: '1rem',
      small: '0.875rem',
      tiny: '0.75rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  // Spacing
  spacing: {
    section: '6rem',
    sectionMobile: '4rem',
    container: '1280px',
    containerPadding: '1.5rem',
  },

  // Animations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    overlay: 40,
    modal: 50,
    tooltip: 60,
  },
};

// CSS variable map for use with Tailwind
export const cssVariables = `
  :root {
    --hp-bg-primary: ${homepageTheme.colors.background.primary};
    --hp-bg-secondary: ${homepageTheme.colors.background.secondary};
    --hp-bg-tertiary: ${homepageTheme.colors.background.tertiary};
    --hp-gold: ${homepageTheme.colors.accent.gold};
    --hp-gold-light: ${homepageTheme.colors.accent.goldLight};
    --hp-text-primary: ${homepageTheme.colors.text.primary};
    --hp-text-secondary: ${homepageTheme.colors.text.secondary};
    --hp-text-muted: ${homepageTheme.colors.text.muted};
    --hp-border: ${homepageTheme.colors.ui.border};
  }
`;

export default homepageTheme;
