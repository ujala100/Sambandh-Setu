import { Platform } from 'react-native';

/**
 * Shared warm cream, rose, forest-green text, and mint accent tokens for web and native screens.
 */
const webColors = {
  primary: '#C14778',
  primaryText: '#923454',
  primaryHover: '#AA3867',
  primarySoft: '#FBE5ED',
  primaryLine: '#EAB9CC',
  primaryDisabled: '#E5A4BC',
  navy: '#173F32',
  bg: '#F8F5E9',
  bgTint: '#F6ECE8',
  surface: '#FFFDF7',
  border: '#E8DAD8',
  borderStrong: '#D7C6C5',
  text: '#263B31',
  textSoft: '#42574B',
  muted: '#647067',
  faint: '#929B94',
  disabled: '#D8CBCD',
  success: '#3D6749',
  successSoft: '#E7F1E9',
  greenSurface: '#D7E9DE',
  mint: '#6EAE90',
  warning: '#C69245',
  warningSoft: '#FBF3E6',
  danger: '#B55353',
  dangerStrong: '#D93B3B',
  dangerSoft: '#FCEDED',
  online: '#6EAE90',
  overlay: 'rgba(38, 59, 49, 0.45)',
  // Soft tints used behind section icons (Settings, Profile sections, Guide cards).
  tint: {
    blue: { fg: '#923454', bg: '#FBE5ED' },
    purple: { fg: '#923454', bg: '#FBE5ED' },
    green: { fg: '#173F32', bg: '#E7F1E9' },
    orange: { fg: '#E07B2E', bg: '#FDF0E6' },
    pink: { fg: '#923454', bg: '#FBE5ED' },
    teal: { fg: '#173F32', bg: '#E7F1E9' },
    amber: { fg: '#C98A12', bg: '#FDF5E1' },
    red: { fg: '#D93B3B', bg: '#FCEDED' },
    slate: { fg: '#647067', bg: '#F1EEE8' },
  },
};

const appColors = {
  ...webColors,
  primary: '#C14778',
  primaryText: '#923454',
  primaryHover: '#AA3867',
  primarySoft: '#FBE5ED',
  primaryLine: '#EAB9CC',
  primaryDisabled: '#E5A4BC',
  navy: '#173F32',
  bg: '#F8F5E9',
  bgTint: '#F6ECE8',
  surface: '#FFFDF7',
  border: '#E8DAD8',
  borderStrong: '#D7C6C5',
  text: '#263B31',
  textSoft: '#42574B',
  muted: '#647067',
  faint: '#929B94',
  disabled: '#D8CBCD',
  tint: {
    ...webColors.tint,
    blue: { fg: '#923454', bg: '#FBE5ED' },
    purple: { fg: '#923454', bg: '#FBE5ED' },
    pink: { fg: '#923454', bg: '#FBE5ED' },
  },
};

export const colors = Platform.OS === 'web' ? webColors : appColors;
export type TintName = keyof typeof colors.tint;

/** 8px soft grid. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, x3: 40, x4: 48 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, input: 10, card: 12, lg: 16, xl: 20, pill: 999 };

export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const type = {
  hero: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, color: colors.text },
  display: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, color: colors.text },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28, color: colors.text },
  section: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSoft },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, color: colors.muted, textTransform: 'uppercase' as const },
};

export const shadow = {
  card: { shadowColor: '#263B31', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  elevated: { shadowColor: '#263B31', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  modal: { shadowColor: '#263B31', shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  button: { shadowColor: '#C14778', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
};

export const MIN_TAP = 44;

/** Breakpoints from "12 · Screen Templates": mobile 390, tablet 768, desktop 1280. */
export const breakpoints = { tablet: 768, desktop: 1024 };
