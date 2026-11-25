import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

export default function AppInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.primary}
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={[styles.input, focused && styles.focused, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card, // Soft Cream: #FDF4F2
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  focused: {
    borderColor: colors.primary, // Rose Pink
    backgroundColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(208, 109, 148, 0.22)' } as any,
      ios: { shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
      android: { elevation: 2 },
    }),
  },
});
