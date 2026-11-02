// Mirror of src/global.css. Change one, change the other, then run `npm run check:contrast`.
// For imperative APIs only — prefer Tailwind classes in JSX.

import { Platform } from 'react-native';

/** Approved brand palette. Identical in both themes. */
export const Brand = {
  atlasNavy: '#0B2545',
  steelBlue: '#2E4C6D',
  heritageGold: '#C08A2E',
  signalCrimson: '#A13D3D',
  successGreen: '#1E8E5A',
  warningAmber: '#E0A62B',
  errorRed: '#C0392B',
  stone: '#F5F2EC',
  midnight: '#10192B',
  ink: '#1C1F26',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    background: '#F5F2EC',
    foreground: '#1C1F26',
    card: '#FCFAF8',
    cardForeground: '#1C1F26',
    popover: '#FCFAF8',
    popoverForeground: '#1C1F26',
    muted: '#E9E5DD',
    mutedForeground: '#5A6572',
    primary: '#0B2545',
    primaryForeground: '#FFFFFF',
    secondary: '#2E4C6D',
    secondaryForeground: '#FFFFFF',
    accent: '#C08A2E',
    accentForeground: '#1C1F26',
    accentEmphasis: '#8D6520',
    critical: '#A13D3D',
    criticalForeground: '#FFFFFF',
    success: '#1C8252',
    successForeground: '#FFFFFF',
    warning: '#E0A62B',
    warningForeground: '#1C1F26',
    destructive: '#C0392B',
    destructiveForeground: '#FFFFFF',
    border: '#D9D4C9',
    input: '#D9D4C9',
    ring: '#0B2545',
  },
  dark: {
    background: '#10192B',
    foreground: '#FFFFFF',
    card: '#192438',
    cardForeground: '#FFFFFF',
    popover: '#192438',
    popoverForeground: '#FFFFFF',
    muted: '#273249',
    mutedForeground: '#ABB6C4',
    primary: '#38699F',
    primaryForeground: '#FFFFFF',
    secondary: '#2E3C56',
    secondaryForeground: '#FFFFFF',
    accent: '#DAA64E',
    accentForeground: '#10192B',
    accentEmphasis: '#DAA64E',
    critical: '#D16161',
    criticalForeground: '#10192B',
    success: '#40BF84',
    successForeground: '#10192B',
    warning: '#EBB747',
    warningForeground: '#10192B',
    destructive: '#DF5849',
    destructiveForeground: '#10192B',
    border: '#2C374E',
    input: '#2C374E',
    ring: '#DAA64E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeName = keyof typeof Colors;

/** Points. Mirrors Tailwind's 4pt rhythm. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Points. Mirrors --radius (0.625rem). */
export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  full: 9999,
} as const;

/** Registered Manrope faces. React Native cannot derive a weight, so each is its own family. */
export const Fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
