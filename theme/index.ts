export const Theme = {
  colors: {
    primary: '#442a22', // Espresso Core
    primaryContainer: '#5d4037',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#d4ada1',
    onPrimaryFixed: '#2c160e',
    onPrimaryFixedVariant: '#5d4037',
    primaryFixed: '#ffdbd0',
    primaryFixedDim: '#e7bdb1',
    secondary: '#3a6843', // Plantation Green
    secondaryContainer: '#b9ecbd',
    offline:'#26e34c',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#3e6d47',
    secondaryFixed: '#bcefc0',
    secondaryFixedDim: '#a0d3a5',
    onSecondaryFixed: '#00210a',
    onSecondaryFixedVariant: '#22502d',
    tertiary: '#412d11', // Soil
    tertiaryContainer: '#594325',
    onTertiary: '#ffffff',
    onTertiaryContainer: '#d0b08b',
    tertiaryFixed: '#ffddb6',
    tertiaryFixedDim: '#e2c19b',
    onTertiaryFixed: '#291801',
    onTertiaryFixedVariant: '#594325',
    background: '#fff8f3', // Warm Cream
    onBackground: '#1f1b14',
    surface: '#fff8f3',
    onSurface: '#1f1b14',
    surfaceVariant: '#ebe1d6',
    onSurfaceVariant: '#504441',
    surfaceBright: '#fff8f3',
    surfaceDim: '#e2d9ce',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#fcf2e7',
    surfaceContainer: '#f6ece1',
    surfaceContainerHigh: '#f1e7dc',
    surfaceContainerHighest: '#ebe1d6',
    surfaceTint: '#77574d',
    outline: '#827470',
    outlineVariant: '#d4c3be',
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    inverseSurface: '#353028',
    inverseOnSurface: '#f9efe4',
    inversePrimary: '#e7bdb1',
    white: '#ffffff',
    success: '#3a6843',
    // Terroir Editorial Theme
    terroirBeige: '#F9F7F2',
    terroirBrown: '#5D3A2C',
    terroirGreen: '#3E6641',
    terroirGreenLight: '#E9F1EA',
    terroirGray: '#7A7A7A',
    terroirText: '#2D2D2D',
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
    xxxl: 36,
    full: 9999,
  },
  typography: {
    display: {
      fontFamily: 'Manrope', // Updated
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      color: '#1f1b14',
    },
    headline: {
      fontFamily: 'Manrope', // Updated
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      color: '#1f1b14',
    },
    body: {
      fontFamily: 'Public Sans', // Updated
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: '#1f1b14',
    },
    label: {
      fontFamily: 'Public Sans', // Updated
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      color: '#504441',
    },
    labelSm: {
      fontFamily: 'Public Sans', // Updated
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
      color: '#504441',
    }
  },
  shadows: {
    ambient: {
      shadowColor: '#1f1b14',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    }
  }
};

