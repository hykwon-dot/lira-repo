import { MD3DarkTheme, MD3Theme } from 'react-native-paper';

const deepBluePalette = {
  midnight: '#0B1120',
  navy: '#1D2A44',
  cobalt: '#274690',
  azure: '#3A6FF7',
  accent: '#FFD166',
  softWhite: '#F8FAFC',
  slate: '#94A3B8',
};

export const liraTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 14,
  colors: {
    ...MD3DarkTheme.colors,
    primary: deepBluePalette.azure,
    primaryContainer: deepBluePalette.cobalt,
    secondary: deepBluePalette.accent,
    secondaryContainer: '#5E4B8B',
    background: deepBluePalette.midnight,
    surface: deepBluePalette.navy,
    surfaceVariant: deepBluePalette.cobalt,
    onPrimary: deepBluePalette.softWhite,
    onSecondary: deepBluePalette.midnight,
    onSurface: deepBluePalette.softWhite,
    onSurfaceVariant: deepBluePalette.slate,
    outline: '#4C566A',
    elevation: {
      level0: 'transparent',
      level1: '#151B2F',
      level2: '#1A2036',
      level3: '#1F2842',
      level4: '#25304E',
      level5: '#2C385C',
    },
  },
  fonts: {
    ...MD3DarkTheme.fonts,
  },
};

export type LiraTheme = typeof liraTheme;
