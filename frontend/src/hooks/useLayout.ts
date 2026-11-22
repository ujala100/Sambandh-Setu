import { Platform, useWindowDimensions } from 'react-native';
import { breakpoints } from '../theme';

/**
 * Responsive layout. "wide" switches to the desktop web layout from the Web designs
 * (top bar + left navigation + right rails). Narrow screens use the App designs.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const wide = isWeb && width >= breakpoints.desktop;
  const tablet = width >= breakpoints.tablet;
  return { width, height, isWeb, wide, tablet, gutter: wide ? 24 : 16 };
}
