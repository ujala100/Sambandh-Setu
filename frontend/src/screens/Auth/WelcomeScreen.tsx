import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBackground from '../../components/AppBackground';
import AppLogo from '../../components/AppLogo';
import { colors, fonts, radius, spacing } from '../../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PILLARS = [
  { icon: 'shield-checkmark', label: 'Verified Profiles', color: '#4D6257' },
  { icon: 'sparkles', label: 'AI Setu Guide', color: '#D06D94' },
  { icon: 'heart-circle', label: 'Values First', color: '#D06D94' },
] as const;

const TRUST_BADGES = [
  { emoji: '🛡', label: 'Verified' },
  { emoji: '🤝', label: 'Guided' },
  { emoji: '💞', label: 'Meaningful' },
];

// Individual floating heart component
function FloatingHeart({ x, delay, duration }: { x: number; delay: number; duration: number }) {
  const posY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(posY, { toValue: -300, duration, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: 400, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration - 400, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(posY, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingHeart,
        { left: x, transform: [{ translateY: posY }], opacity },
      ]}
    >
      <Ionicons name="heart" size={18} color="#D06D94" />
    </Animated.View>
  );
}

export default function WelcomeScreen({ navigation }: any) {
  const scaleHeart = useRef(new Animated.Value(0.95)).current;
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Pulsing heart
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleHeart, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(scaleHeart, { toValue: 0.95, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Entrance animation
    Animated.parallel([
      Animated.timing(entranceFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(entranceSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Romantic Atmospheric Dating Wallpaper */}
      <AppBackground opacity={0.42} />

      {/* Floating hearts */}
      <FloatingHeart x={SCREEN_W * 0.1} delay={0} duration={3800} />
      <FloatingHeart x={SCREEN_W * 0.35} delay={1200} duration={4500} />
      <FloatingHeart x={SCREEN_W * 0.62} delay={600} duration={4000} />
      <FloatingHeart x={SCREEN_W * 0.82} delay={2000} duration={3500} />

      <SafeAreaView style={styles.safe}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Animated.View style={[styles.heartCircle, { transform: [{ scale: scaleHeart }] }]}>
            <AppLogo size={68} imageStyle={{ borderRadius: 20 }} />
          </Animated.View>
          <Text style={styles.brandTitle}>Sambandh Setu</Text>
          <Text style={styles.brandTagline}>Intentional · Guided · Meaningful</Text>
        </View>

        {/* Hero Card */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: entranceFade,
              transform: [{ translateY: entranceSlide }],
            },
          ]}
        >
          <Text style={styles.heroHeadline}>Find Your Person</Text>
          <Text style={styles.heroSubtitle}>
            Discover genuine connections built on shared values and guided growth.
          </Text>

          <View style={styles.pillarsContainer}>
            {PILLARS.map((p) => (
              <View key={p.label} style={styles.pillarRow}>
                <View style={styles.pillarIconWrap}>
                  <Ionicons name={p.icon as any} size={18} color={p.color} />
                </View>
                <Text style={styles.pillarLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View
          style={[
            styles.ctaSection,
            {
              opacity: entranceFade,
              transform: [{ translateY: entranceSlide }],
            },
          ]}
        >
          <Pressable
            onPress={() => navigation.navigate('CreateAccount', { mode: 'signup' })}
            style={({ pressed }) => [styles.primaryBtnWrap, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={['#E07AA0', '#D06D94', '#B8557B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.outlineBtnText}>Sign In</Text>
          </Pressable>
        </Animated.View>

        {/* Trust Badges */}
        <View style={styles.trustRow}>
          {TRUST_BADGES.map((b, i) => (
            <React.Fragment key={b.label}>
              <View style={styles.trustBadge}>
                <Text style={styles.trustEmoji}>{b.emoji}</Text>
                <Text style={styles.trustLabel}>{b.label}</Text>
              </View>
              {i < TRUST_BADGES.length - 1 && <View style={styles.trustDivider} />}
            </React.Fragment>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAC6D6',
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heartCircle: {
    marginBottom: 12,
    borderRadius: 40,
    shadowColor: '#D06D94',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heartGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: '#243B36',
    textAlign: 'center',
  },
  brandTagline: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#4D6257',
    textAlign: 'center',
    marginTop: 4,
  },

  // Hero Card
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 28,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#D06D94',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroHeadline: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: '#243B36',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#4D6257',
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  pillarsContainer: {
    gap: 12,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(208,109,148,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pillarLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#243B36',
  },

  // CTA
  ctaSection: {
    gap: 12,
    marginBottom: spacing.xl,
  },
  primaryBtnWrap: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: '#D06D94',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: radius.pill,
  },
  primaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    borderWidth: 2,
    borderColor: '#D06D94',
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  outlineBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#D06D94',
  },

  // Trust badges
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.pill,
  },
  trustEmoji: {
    fontSize: 13,
  },
  trustLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#4D6257',
  },
  trustDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(77,98,87,0.2)',
    marginHorizontal: 4,
  },

  // Floating hearts
  floatingHeart: {
    position: 'absolute',
    bottom: 100,
    zIndex: 0,
  },
});
