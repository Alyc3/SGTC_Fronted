export const Theme = {
  colors: {
    primary: '#3E2723', // Dark Brown
    primaryContainer: '#5D4037',
    onPrimary: '#ffffff',
    secondary: '#889E81', // Sage Green
    secondaryContainer: '#E8F5E9',
    onSecondaryContainer: '#2E7D32',
    background: '#FDF8F4', // Warm Cream
    surface: '#ffffff',
    surfaceContainerLow: '#FDF8F4',
    surfaceContainerHighest: '#F5F5F5',
    onSurface: '#3E2723',
    onSurfaceVariant: '#795548',
    outline: '#D7CCC8',
    outlineVariant: '#EFEBE9',
    error: '#B71C1C',
    success: '#889E81',
    white: '#ffffff',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  roundness: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
  typography: {
    display: {
      fontFamily: 'System',
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      color: '#3E2723',
    },
    headline: {
      fontFamily: 'System',
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      color: '#3E2723',
    },
    body: {
      fontFamily: 'System',
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: '#3E2723',
    },
    label: {
      fontFamily: 'System',
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      color: '#795548',
    },
    labelSm: {
      fontFamily: 'System',
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
      color: '#795548',
    }
  },
  shadows: {
    ambient: {
      shadowColor: '#3E2723',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    }
  }
};
