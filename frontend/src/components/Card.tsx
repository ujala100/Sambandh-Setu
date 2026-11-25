import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  secondary?: boolean;
  bordered?: boolean;
};

export default function Card({ children, style, secondary, bordered = true }: Props) {
  return (
    <View
      style={[
        styles.card,
        secondary && { backgroundColor: colors.cardSecondary },
        bordered && styles.border,
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  border: {
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
