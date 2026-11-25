import { Platform } from 'react-native';
import { colors } from '../theme';

// Removes the browser's default black outline on web.
export const noOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {};

// Romantic Rose Pink border (plus a soft ring on web) for a focused field wrapper
export const focusedBox: any = {
  borderColor: colors.primary,
  ...(Platform.OS === 'web' ? { boxShadow: '0 0 0 3px rgba(208, 109, 148, 0.22)' } : {}),
};
