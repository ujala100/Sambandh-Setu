// Sambandh Setu - Mint & Blush Pink Design System Tokens
// Palette:
// Mint Green: #C0E1CF (Main Background)
// Soft Cream: #FDF4F2 (Card Background)
// Blush Pink: #FAC6D6 (Highlights, badges, soft chips)
// Rose Pink: #D06D94 (Primary buttons, hearts, active states)
// Sage Mint: #DFEBE1 (Success cards, verified badges)
// Deep Forest Green: #4D6257 (Icons and text accents)
// Dark Charcoal Green: #243B36 (Main text)

export const colors = {
  // Brand Primary & Highlights
  primary: '#D06D94',            // Rose Pink - Primary action buttons, active tabs, heart icons
  primaryDark: '#B8557B',        // Deep Rose Pink (pressed states)
  primarySoft: '#FAC6D6',        // Blush Pink - Highlights, active pills, badges
  primarySubtle: '#FCE7EE',      // Romantic faint rose blush
  
  // Backgrounds & Surfaces
  bg: '#C0E1CF',                 // Mint Green - Main page background
  bgSoft: '#D8EDE2',             // Lighter mint for nested scrolls or top banners
  card: '#FDF4F2',               // Soft Cream - Card background
  cardSecondary: '#DFEBE1',      // Sage Mint - Success cards / Info cards
  cardElevated: '#FFFFFF',       // Pure warm white for popovers and crisp floating chips
  
  // Typography & Accents
  text: '#243B36',               // Dark Charcoal Green - Main headings & primary body text
  textMuted: '#4D6257',          // Deep Forest Green - Subtitles, secondary copy, captions
  muted: '#4D6257',              // Deep Forest Green alias
  iconAccent: '#4D6257',         // Deep Forest Green - Icons and navigation accents
  forest: '#4D6257',             // Deep Forest Green
  border: 'rgba(77, 98, 87, 0.16)', // Subtle forest border
  borderLight: 'rgba(77, 98, 87, 0.08)',
  
  // Specific Palette Aliases
  mint: '#C0E1CF',
  cream: '#FDF4F2',
  blush: '#FAC6D6',
  rose: '#D06D94',
  sage: '#DFEBE1',
  darkCharcoal: '#243B36',
  
  // Status & Dating Feedback
  success: '#2E7D5B',            // Forest green success
  successSoft: '#DFEBE1',        // Sage Mint
  danger: '#E0485A',             // Coral Red for pass / decline / delete
  dangerSoft: '#FDECEE',
  warning: '#D97706',            // Warm amber
  warningSoft: '#FEF3C7',
  disabled: 'rgba(77, 98, 87, 0.22)',
  disabledText: 'rgba(77, 98, 87, 0.45)',
  
  // Romance & Highlights
  heart: '#D06D94',              // Rose Pink
  heartBg: '#FAC6D6',            // Blush Pink
  gold: '#D97706',               // Gold for verified badges
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 };

export const fonts = {
  display: 'PlayfairDisplay_700Bold', // big romantic serif headlines
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const shadow = {
  card: {
    shadowColor: '#243B36',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#D06D94',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  button: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floatingDock: {
    shadowColor: '#243B36',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const MIN_TAP = 44; // accessibility: minimum tap target
