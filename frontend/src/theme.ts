/**
 * Sambandh Setu Design System v2.0 tokens (from "Design system.png").
 * Trust Blue #2C67C5 is the single primary colour. No purple/pink primaries.
 */
export const colors = {
  primary: '#2C67C5',
  primaryHover: '#2458AA',
  primarySoft: '#E8F0FF',
  primaryLine: '#C9DAF6',
  navy: '#183B70',
  bg: '#F8FAFC',
  bgTint: '#F3F7FD',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textSoft: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  disabled: '#CBD5E1',
  success: '#10B981',
  successSoft: '#E7F8F1',
  warning: '#C69245',
  warningSoft: '#FBF3E6',
  danger: '#B55353',
  dangerStrong: '#D93B3B',
  dangerSoft: '#FCEDED',
  online: '#22C55E',
  overlay: 'rgba(15, 23, 42, 0.45)',
  // Soft tints used behind section icons (Settings, Profile sections, Guide cards).
  tint: {
    blue: { fg: '#2C67C5', bg: '#E8F0FF' },
    purple: { fg: '#7C5CDB', bg: '#F1ECFD' },
    green: { fg: '#0F9F6E', bg: '#E7F8F1' },
    orange: { fg: '#E07B2E', bg: '#FDF0E6' },
    pink: { fg: '#D9467A', bg: '#FDEBF2' },
    teal: { fg: '#0E9494', bg: '#E4F6F6' },
    amber: { fg: '#C98A12', bg: '#FDF5E1' },
    red: { fg: '#D93B3B', bg: '#FCEDED' },
    slate: { fg: '#475569', bg: '#F1F5F9' },
  },
};
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
  card: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  elevated: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  modal: { shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  button: { shadowColor: '#2C67C5', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
};

export const MIN_TAP = 44;

/** Breakpoints from "12 · Screen Templates": mobile 390, tablet 768, desktop 1280. */
export const breakpoints = { tablet: 768, desktop: 1024 };
