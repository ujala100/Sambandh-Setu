import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

type Tone = 'pink' | 'mint' | 'rose' | 'cream' | 'red' | 'blue' | 'green' | 'orange' | 'grey';

const tones: Record<Tone, { bg: string; fg: string }> = {
  pink: { bg: colors.primarySoft, fg: colors.primaryDark },
  mint: { bg: colors.cardSecondary, fg: colors.textMuted },
  rose: { bg: colors.primary, fg: '#FFFFFF' },
  cream: { bg: colors.card, fg: colors.text },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  blue: { bg: colors.primarySoft, fg: colors.primaryDark },
  green: { bg: colors.cardSecondary, fg: colors.success },
  orange: { bg: colors.warningSoft, fg: colors.warning },
  grey: { bg: 'rgba(77, 98, 87, 0.12)', fg: colors.textMuted },
};

export default function Chip({ label, tone = 'pink', dot }: { label: string; tone?: Tone; dot?: boolean }) {
  const t = tones[tone] || tones.pink;
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: t.fg }]} />}
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginRight: 6,
    marginBottom: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontFamily: fonts.medium, fontSize: 12.5 },
});
