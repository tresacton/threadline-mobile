/**
 * Threadline design tokens. Plain React Native StyleSheet (no NativeWind).
 * A warm, calm palette for a memory-keeping companion — the app holds personal,
 * sometimes tender material, so the surface should feel quiet and trustworthy.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A2E',
    textSecondary: '#5C5C72',
    textMuted: '#8A8AA0',
    background: '#FBF9F6', // warm paper
    card: '#FFFFFF',
    backgroundElement: '#F2EFEA',
    backgroundSelected: '#E8E3DB',
    border: '#E6E1D8',
    primary: '#5B6CF0', // companion indigo
    primaryText: '#FFFFFF',
    accent: '#E08D79', // warm terracotta
    success: '#3FA796',
    danger: '#C2483D',
    warning: '#C98A2B',
    onPrimary: '#FFFFFF',
  },
  dark: {
    text: '#F4F2EE',
    textSecondary: '#B6B6C6',
    textMuted: '#7E7E95',
    background: '#13131C',
    card: '#1C1C28',
    backgroundElement: '#23232F',
    backgroundSelected: '#2C2C3A',
    border: '#2E2E3C',
    primary: '#8893F5',
    primaryText: '#10101A',
    accent: '#E8A38F',
    success: '#5BBFAE',
    danger: '#E0695E',
    warning: '#E0A94B',
    onPrimary: '#10101A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = { [K in keyof (typeof Colors)['light']]: string };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'system-ui, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
