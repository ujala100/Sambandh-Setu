import React, { useEffect, useState } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui';
import { colors, fonts, space } from '../theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pink?: boolean;
  decoration?: 'hearts' | 'story';
  decorationPosition?: 'topLeft' | 'topRight';
};

export function ProfileSection({ icon, title, subtitle, children, style, pink = false, decoration, decorationPosition = 'topRight' }: Props) {
  const [heartScale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (decoration !== 'hearts') return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.14, duration: 900, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [decoration, heartScale]);

  const ornament = decoration === 'hearts' ? (
    <View style={styles.heartSticker}>
      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
        <Ionicons name="heart" size={38} color={colors.primary} style={styles.stickerShadow} />
      </Animated.View>
      <Ionicons name="heart" size={22} color={colors.primaryLine} style={[styles.smallHeart, styles.stickerShadow]} />
    </View>
  ) : decoration === 'story' ? (
    <View style={styles.storySticker}>
      <Ionicons name="cloud" size={42} color={colors.primary} style={[styles.storyMainCloud, styles.stickerShadow]} />
      <Ionicons name="cloud" size={25} color={colors.primaryLine} style={[styles.storySupportCloud, styles.stickerShadow]} />
      <View style={styles.cloudDots}>
        <View style={styles.cloudDot} />
        <View style={styles.cloudDot} />
        <View style={styles.cloudDot} />
      </View>
    </View>
  ) : null;

  return (
    <View style={[styles.wrapper, style]}>
      <Card
        tone={pink ? 'soft' : 'surface'}
        style={[styles.card, pink && styles.pinkCard]}
      >
        <View style={styles.heading}>
          <View style={[styles.icon, pink && styles.pinkIcon]}>
            <Ionicons name={icon} size={19} color={pink ? colors.primaryText : colors.primary} />
          </View>
          <View style={styles.headingText}>
            <Text style={[styles.title, pink && styles.pinkTitle]}>{title}</Text>
            <Text style={[styles.subtitle, pink && styles.pinkSubtitle]}>{subtitle}</Text>
          </View>
        </View>
        {children}
      </Card>
      {ornament ? (
        <View style={[styles.ornament, decorationPosition === 'topLeft' ? styles.ornamentLeft : styles.ornamentRight]} pointerEvents="none" accessible={false}>
          {ornament}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: space.lg },
  card: { shadowOpacity: 0 },
  pinkCard: { backgroundColor: colors.primarySoft, borderColor: colors.primaryLine },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.lg },
  headingText: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pinkIcon: { backgroundColor: colors.surface },
  ornament: { position: 'absolute', top: -17, width: 58, height: 58, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  ornamentLeft: { left: 14 },
  ornamentRight: { right: 14 },
  heartSticker: { width: 56, height: 52, alignItems: 'center', justifyContent: 'center' },
  smallHeart: { position: 'absolute', left: 0, bottom: 1 },
  storySticker: { width: 56, height: 56 },
  storyMainCloud: { position: 'absolute', left: 1, top: 8 },
  storySupportCloud: { position: 'absolute', right: 0, top: 1 },
  cloudDots: { position: 'absolute', left: 15, top: 28, flexDirection: 'row', gap: 4 },
  cloudDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFDF7' },
  stickerShadow: { textShadowColor: '#FFFDF7', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 2 },
  pinkTitle: { color: '#263B31' },
  pinkSubtitle: { color: '#5C6E63' },
});
