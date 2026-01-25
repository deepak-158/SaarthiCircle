// SaathiCircle - Theme Configuration
// Designed for elderly users with high accessibility

export const colors = {
  // Primary Colors - Calm and Trust-building
  primary: {
    light: '#E8F4FD',      // Light blue background
    main: '#5B9BD5',       // Main blue
    dark: '#2E75B6',       // Dark blue
  },
  
  // Secondary Colors - Warm and Comforting
  secondary: {
    green: '#8FBC8F',      // Warm green
    greenLight: '#E8F5E9', // Light green
    beige: '#F5F5DC',      // Warm beige
    cream: '#FFF8E7',      // Cream
  },
  
  // Accent Colors for Actions
  accent: {
    orange: '#FF8C42',     // Companion/Talk button
    red: '#E53935',        // Emergency/SOS
    yellow: '#FFD54F',     // Warning
  },
  // Danger Colors (alias around accent.red for compatibility)
  danger: {
    light: '#FFEBEE',      // Light red background
    main: '#E53935',       // Same as accent.red
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    lightGray: '#F5F5F5',
    mediumGray: '#E0E0E0',
    darkGray: '#666666',
    black: '#333333',
  },
  
  // Status Colors
  status: {
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
  },
  
  // Mood Colors
  mood: {
    happy: '#4CAF50',
    neutral: '#FFC107',
    sad: '#5B9BD5',
  }
};

export const typography = {
  // Font Sizes - Large for elderly users (minimum 18px)
  sizes: {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 40,
    hero: 48,
  },
  
  // Font Weights
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Accessibility-focused button sizes
export const buttonSizes = {
  sm: {
    height: 48,
    paddingHorizontal: 20,
    fontSize: typography.sizes.sm,
  },
  md: {
    height: 60,
    paddingHorizontal: 28,
    fontSize: typography.sizes.md,
  },
  lg: {
    height: 72,
    paddingHorizontal: 36,
    fontSize: typography.sizes.lg,
  },
  xl: {
    height: 88,
    paddingHorizontal: 44,
    fontSize: typography.sizes.xl,
  },
};

// Touch target sizes for accessibility (minimum 48x48)
export const touchTargets = {
  minimum: 48,
  recommended: 60,
  large: 80,
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  buttonSizes,
  touchTargets,
};
