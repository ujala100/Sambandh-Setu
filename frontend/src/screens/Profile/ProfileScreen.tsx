import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import AppBackground from '../../components/AppBackground';
import AppLogo from '../../components/AppLogo';
import { getJourney } from '../../services/journeyApi';
import { useOwnProfile } from '../../services/ownProfile';
import { STAGE_LABELS } from '../../services/mockData';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

// ---- Profile completion helper ----
function computeCompletion(me: ReturnType<typeof useOwnProfile>): number {
  const fields = [me.name, me.age, me.gender, me.height, me.education, me.profession, me.location, me.bio, me.photoUri];
  const filled = fields.filter((v) => !!v && String(v) !== '0').length;
  return Math.round((filled / fields.length) * 100);
}

// ---- Animated progress bar ----
function CompletionBar({ pct }: { pct: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.progressOuter}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFillWrap,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={['#D06D94', '#FAC6D6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={styles.progressLabel}>{pct}% complete</Text>
    </View>
  );
}

// ---- Quick info tile ----
function InfoTile({
  icon,
  label,
  value,
  gradientColors,
}: {
  icon: string;
  label: string;
  value: string;
  gradientColors: [string, string];
}) {
  return (
    <View style={styles.infoTile}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.infoTileGradient}
      >
        <View style={styles.infoTileIconWrap}>
          <Ionicons name={icon as any} size={18} color={colors.primary} />
        </View>
        <Text style={styles.infoTileValue} numberOfLines={1}>
          {value || '—'}
        </Text>
        <Text style={styles.infoTileLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

// ---- Animated menu row ----
function MenuRow({
  icon,
  label,
  gradientColors,
  onPress,
  showBorder,
}: {
  icon: string;
  label: string;
  gradientColors: [string, string];
  onPress: () => void;
  showBorder: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 0.8, duration: 80, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        style={[styles.menuRow, showBorder && styles.menuBorder]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.menuIconCircle}
        >
          <Ionicons name={icon as any} size={17} color="#fff" />
        </LinearGradient>
        <Text style={styles.menuText}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </Animated.View>
  );
}

// ---- Main ProfileScreen ----
export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const me = useOwnProfile();
  const [stageLabel, setStageLabel] = useState('');

  useFocusEffect(
    useCallback(() => {
      getJourney()
        .then((j) => {
          const a = j.stages?.find((s: any) => s.status === 'active');
          setStageLabel(a ? STAGE_LABELS[a.key as keyof typeof STAGE_LABELS] : '');
        })
        .catch(() => setStageLabel(''));
    }, [])
  );

  const edit = () => navigation.navigate('EditProfile');
  const photo = me.photoUri || (user as any)?.avatar;
  const completion = computeCompletion(me);

  const menu = [
    {
      icon: 'person-outline',
      label: 'View Public Profile',
      gradientColors: ['#D06D94', '#FAC6D6'] as [string, string],
      onPress: () => navigation.navigate('ProfileDetail', { mode: 'own' }),
    },
    {
      icon: 'create-outline',
      label: 'Edit Profile & Photos',
      gradientColors: ['#C0E1CF', '#4D6257'] as [string, string],
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'sparkles-outline',
      label: 'Setu Guide Settings',
      gradientColors: ['#FAC6D6', '#D06D94'] as [string, string],
      onPress: () => navigation.navigate('SetuGuideSettings'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy & Safety',
      gradientColors: ['#DFEBE1', '#4D6257'] as [string, string],
      onPress: () => navigation.navigate('PrivacyVisibility'),
    },
    {
      icon: 'settings-outline',
      label: 'Account Settings',
      gradientColors: ['#243B36', '#4D6257'] as [string, string],
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Atmospheric Dating Background Wallpaper */}
      <AppBackground opacity={0.32} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              <AppLogo size={18} style={{ marginRight: 6 }} />
              <Text style={styles.brandTag}>MY PROFILE</Text>
            </View>
            <Text style={styles.title}>Self & Values</Text>
            <Text style={styles.subtitle}>Present your authentic self with care.</Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Hero Banner — gradient behind avatar */}
        <View style={[styles.heroCard, shadow.card]}>
          <LinearGradient
            colors={['#D06D94', '#FAC6D6', '#FDF4F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Avatar with glowing rose border ring */}
            <Pressable onPress={edit} style={styles.avatarWrapper} accessibilityLabel="Change photo">
              <LinearGradient
                colors={['#D06D94', '#FAC6D6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRingGradient}
              >
                <View style={styles.avatarRingInner}>
                  <Avatar uri={photo} name={me.name || user?.name || 'Me'} size={96} />
                </View>
              </LinearGradient>
              {/* camera edit badge */}
              <View style={styles.photoEditBtn}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </Pressable>

            {/* Name */}
            <Text style={styles.heroName} numberOfLines={1}>
              {me.name || 'Member'}
              {me.age ? `, ${me.age}` : ''}
            </Text>
            {!!me.profession && <Text style={styles.heroProfession}>{me.profession}</Text>}
            {!!me.location && (
              <View style={styles.heroLocRow}>
                <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroLoc}>{me.location}</Text>
              </View>
            )}
          </LinearGradient>

          {/* Profile completion bar */}
          <View style={styles.completionSection}>
            <View style={styles.completionHead}>
              <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
              <Text style={styles.completionTitle}>Profile Completion</Text>
            </View>
            <CompletionBar pct={completion} />
          </View>

          {/* Stage badge */}
          {!!stageLabel && (
            <View style={styles.stageBadgeRow}>
              <LinearGradient
                colors={['#D06D94', '#FAC6D6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.stageBadge}
              >
                <Ionicons name="infinite" size={13} color="#fff" />
                <Text style={styles.stageBadgeText}>In Journey: {stageLabel}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Edit profile pill */}
          <Pressable style={styles.editProfilePill} onPress={edit}>
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={styles.editProfilePillText}>Edit Profile Details</Text>
          </Pressable>
        </View>

        {/* Quick info grid — 4 tiles */}
        <View style={styles.infoGrid}>
          <InfoTile
            icon="calendar-outline"
            label="Age"
            value={me.age ? `${me.age} yrs` : ''}
            gradientColors={['#FDF4F2', '#FAC6D6']}
          />
          <InfoTile
            icon="location-outline"
            label="Location"
            value={me.location || ''}
            gradientColors={['#FDF4F2', '#DFEBE1']}
          />
          <InfoTile
            icon="briefcase-outline"
            label="Profession"
            value={me.profession || ''}
            gradientColors={['#FDF4F2', '#FAC6D6']}
          />
          <InfoTile
            icon="school-outline"
            label="Education"
            value={me.education || ''}
            gradientColors={['#FDF4F2', '#DFEBE1']}
          />
        </View>

        {/* Bio card */}
        <View style={[styles.bioCard, shadow.card]}>
          <View style={styles.bioAccentBar} />
          <View style={styles.bioContent}>
            <View style={styles.bioHead}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
              <Text style={styles.bioHeadTitle}>About Me</Text>
            </View>
            <Text style={styles.bioText}>
              {me.bio ||
                'Add a thoughtful bio so people can understand your passions, values, and what brings you joy.'}
            </Text>
          </View>
        </View>

        {/* Journey promo card */}
        <Pressable
          style={[styles.journeyCard, shadow.card]}
          onPress={() => navigation.navigate('Journey')}
        >
          <LinearGradient
            colors={['#DFEBE1', '#C0E1CF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.journeyGradient}
          >
            <View style={styles.journeyIconCircle}>
              <LinearGradient
                colors={['#D06D94', '#FAC6D6']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Ionicons name="infinite" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.journeyTitle}>Your Setu Journey</Text>
              <Text style={styles.journeySubtitle}>
                {stageLabel ? `Currently at: ${stageLabel}` : 'Ready to begin when you connect'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </LinearGradient>
        </Pressable>

        {/* Menu */}
        <View style={[styles.menuCard, shadow.card]}>
          {menu.map((m, i) => (
            <MenuRow
              key={m.label}
              icon={m.icon}
              label={m.label}
              gradientColors={m.gradientColors}
              onPress={m.onPress}
              showBorder={i > 0}
            />
          ))}
        </View>

        {/* Sign out */}
        <Pressable style={styles.signOut} onPress={signOut} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out of Sambandh Setu</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  brandTag: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  heroBanner: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarRingGradient: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D06D94',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarRingInner: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroProfession: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  heroLoc: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.78)',
  },

  // Completion
  completionSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  completionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  completionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.text,
  },
  progressOuter: {
    gap: 5,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(208, 109, 148, 0.12)',
    overflow: 'hidden',
  },
  progressFillWrap: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
  },

  // Stage badge
  stageBadgeRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    shadowColor: '#D06D94',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stageBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#fff',
  },

  // Edit pill
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingVertical: 11,
    borderRadius: radius.pill,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  editProfilePillText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  // Info grid (4 tiles in 2x2)
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTile: {
    width: '48%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.card,
  },
  infoTileGradient: {
    padding: spacing.md,
    minHeight: 80,
    justifyContent: 'center',
  },
  infoTileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  infoTileValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  infoTileLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },

  // Bio card
  bioCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bioAccentBar: {
    width: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  bioContent: {
    flex: 1,
    padding: spacing.lg,
  },
  bioHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  bioHeadTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
  },
  bioText: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
    fontStyle: 'italic',
  },

  // Journey card
  journeyCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(77, 98, 87, 0.12)',
  },
  journeyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  journeyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  journeySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Menu card
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  menuBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.md,
  },

  // Sign out
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
  },
  signOutText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.danger,
  },
});
