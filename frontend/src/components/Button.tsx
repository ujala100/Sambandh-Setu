import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, MIN_TAP, radius, shadow } from '../theme';

type Variant = 'primary' | 'outline' | 'text' | 'danger' | 'soft';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  arrow?: boolean;
  icon?: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function Button({
  title, onPress, variant = 'primary', disabled, loading, arrow, icon, small, style, accessibilityLabel,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isFilled = variant === 'primary' || variant === 'danger';
  const isSoft = variant === 'soft';
  const textColor = isFilled ? '#FFFFFF' : isSoft ? colors.text : colors.primary;
  const inactive = disabled || loading;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: !!inactive }}
        disabled={inactive}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          small && styles.small,
          variant === 'primary' && [styles.primary, shadow.button, pressed && { backgroundColor: colors.primaryDark }],
          variant === 'danger' && [styles.danger, pressed && { opacity: 0.88 }],
          variant === 'outline' && [styles.outline, pressed && { backgroundColor: colors.primarySubtle }],
          variant === 'soft' && [styles.soft, pressed && { opacity: 0.85 }],
          variant === 'text' && styles.text,
          inactive && isFilled && { backgroundColor: colors.disabled, shadowOpacity: 0 },
          inactive && !isFilled && { opacity: 0.5 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size={small ? 'small' : 'small'} />
        ) : (
          <>
            {!!icon && (
              <Ionicons
                name={icon as any}
                size={small ? 16 : 18}
                color={textColor}
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={[styles.label, small && { fontSize: 13 }, { color: textColor }]}>
              {title}
            </Text>
            {arrow && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color={textColor}
                style={{ marginLeft: 8 }}
              />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    minWidth: MIN_TAP,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  small: { minHeight: 40, paddingHorizontal: 16 },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  soft: {
    backgroundColor: colors.primarySoft,
  },
  text: { backgroundColor: 'transparent', minHeight: MIN_TAP },
  label: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.2 },
});
