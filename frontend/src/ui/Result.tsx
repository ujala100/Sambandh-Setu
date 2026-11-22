import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { SuccessMark } from './Feedback';
import { Button } from './Button';
import type { IconName } from './Basics';

/**
 * Full-screen outcome ("Report Submitted", "Family Member Added", "Account Deleted").
 * Content sits in the middle, actions at the bottom (App) or under the text (Web card).
 */
export function ResultView({ title, message, extra, tone = 'green', icon, image, primary, secondary, children }: {
  title: string; message?: string; extra?: string; tone?: 'green' | 'blue' | 'red' | 'amber'; icon?: IconName; image?: ImageSourcePropType;
  primary?: { label: string; onPress: () => void; arrow?: boolean }; secondary?: { label: string; onPress: () => void }; children?: React.ReactNode;
}) {
  const { wide } = useLayout();
  const body = (
    <View style={{ alignItems: 'center' }}>
      {image ? <Image source={image} style={{ width: 200, height: 160, marginVertical: space.xl }} resizeMode="contain" /> : <SuccessMark tone={tone} icon={icon} />}
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      {extra ? <Text style={[styles.msg, { marginTop: 8 }]}>{extra}</Text> : null}
      {children ? <View style={{ alignSelf: 'stretch', marginTop: space.lg }}>{children}</View> : null}
    </View>
  );
  const actions = (
    <View style={{ gap: 10, alignSelf: 'stretch' }}>
      {primary ? <Button title={primary.label} onPress={primary.onPress} arrow={primary.arrow} /> : null}
      {secondary ? <Button title={secondary.label} onPress={secondary.onPress} variant="secondary" /> : null}
    </View>
  );
  if (wide) {
    return (
      <View style={styles.wideCard}>
        {body}
        <View style={{ height: space.xl }} />
        {actions}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: space.xl }}>{body}</View>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 30, color: colors.text, textAlign: 'center' },
  msg: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: 10, maxWidth: 380 },
  wideCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 32, maxWidth: 520, width: '100%' as any, alignSelf: 'center', marginTop: 24 },
});
