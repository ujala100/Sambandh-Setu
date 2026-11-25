import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import { getJourney } from '../../services/journeyApi';
import { Connection, StageKey, StageStatus, STAGE_LABELS } from '../../services/mockData';
import { STAGE_LIST } from '../../services/stageContent';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

export default function JourneyScreen({ navigation }: any) {
  const [conn, setConn] = useState<Connection | null>(null);
  const [stages, setStages] = useState<{ key: string; status: StageStatus }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const j = await getJourney();
      setConn(j.connection);
      setStages(j.stages);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (key: StageKey, status?: string) => {
    const params = { stage: key, match: conn?.name ?? '' };
    if (key === 'reflect' && status === 'completed') return navigation.navigate('ReflectResults', params);
    navigation.navigate(key === 'reflect' ? 'ReflectIntro' : 'Stage', params);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.top}>
        <Pressable onPress={() => navigation.navigate('Home')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {conn ? `Journey with ${conn.name.split(' ')[0]}` : 'Your Relationship Journey'}
        </Text>
        <Pressable onPress={() => navigation.navigate('Guide')} style={styles.iconBtn} accessibilityLabel="Ask Guide">
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ gap: spacing.lg }}>
            <Skeleton height={80} />
            <Skeleton height={90} />
            <Skeleton height={320} />
          </View>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load your journey"
            description="Check your connection and try again."
            actionLabel="Try again"
            onAction={load}
          />
        ) : !conn ? (
          <EmptyState
            icon="heart-outline"
            title="No journey in progress"
            description="Accept a request or explore profiles to start your relationship journey."
            actionLabel="Discover people"
            onAction={() => navigation.navigate('Connections', { tab: 'discover' })}
          />
        ) : (
          <>
            {/* Match Header Card */}
            <View style={[styles.matchCard, shadow.card]}>
              <View style={styles.matchRow}>
                <Avatar size={56} uri={conn.photo} name={conn.name} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={styles.row}>
                    <Text style={styles.matchName}>{conn.name}, {conn.age}</Text>
                    {conn.verified && (
                      <Ionicons name="checkmark-circle" size={15} color={colors.primary} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                  <Text style={styles.matchSub}>{conn.profession || 'Professional'} • {conn.location || 'India'}</Text>
                  <View style={styles.connectedBadge}>
                    <Ionicons name="infinite" size={13} color="#fff" />
                    <Text style={styles.connectedBadgeText}>Connected</Text>
                  </View>
                </View>

                <Pressable onPress={() => setMenuOpen(!menuOpen)} style={styles.iconBtn}>
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
                </Pressable>
              </View>

              {menuOpen && (
                <Pressable
                  style={styles.menuPopover}
                  onPress={() => {
                    setMenuOpen(false);
                    navigation.navigate('ProfileDetail', { personId: conn.id });
                  }}
                >
                  <Ionicons name="person-outline" size={16} color={colors.text} />
                  <Text style={styles.menuPopoverText}>View Profile</Text>
                </Pressable>
              )}
            </View>

            {/* Romantic Philosophy Banner */}
            <View style={[styles.bannerCard, shadow.card]}>
              <View style={styles.bannerIconCircle}>
                <Ionicons name="heart" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Every bond blossoms one step at a time</Text>
                <Text style={styles.bannerSub}>
                  Take all the time you need. Sambandh Setu and Setu Guide are here to nurture genuine intimacy.
                </Text>
              </View>
            </View>

            {/* Vertical Milestone Path */}
            <View style={[styles.stepperContainer, shadow.card]}>
              <Text style={styles.stepperHeading}>Milestones & Stages</Text>
              <Text style={styles.stepperSub}>Guided framework for clarity and meaningful understanding</Text>

              <View style={{ marginTop: spacing.md }}>
                {stages.map((s, i) => {
                  const key = s.key as StageKey;
                  const info = STAGE_LIST[key] || { icon: 'ellipse-outline', text: '' };
                  const first = i === 0;
                  const last = i === stages.length - 1;
                  const completed = s.status === 'completed';
                  const isActive = s.status === 'active';
                  const locked = s.status === 'locked';
                  const prevDone = !first && stages[i - 1].status === 'completed';

                  return (
                    <Pressable
                      key={s.key}
                      disabled={!isActive && !(completed && key === 'reflect')}
                      onPress={() => open(key, s.status)}
                      style={[styles.stageRow, isActive && styles.stageRowActive]}
                    >
                      {/* Vertical Connecting Rail */}
                      <View style={styles.railCol}>
                        <View
                          style={[
                            styles.railLine,
                            { backgroundColor: first ? 'transparent' : prevDone ? colors.success : 'rgba(77, 98, 87, 0.15)' },
                          ]}
                        />
                        <View
                          style={[
                            styles.nodeCircle,
                            completed && { backgroundColor: colors.success },
                            isActive && { backgroundColor: colors.primary, borderColor: colors.primarySoft, borderWidth: 3 },
                            locked && { backgroundColor: colors.cardSecondary },
                          ]}
                        >
                          {completed ? (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          ) : isActive ? (
                            <Ionicons name="infinite" size={16} color="#fff" />
                          ) : (
                            <Ionicons name={info.icon as any} size={14} color={colors.muted} />
                          )}
                        </View>
                        <View
                          style={[
                            styles.railLine,
                            { backgroundColor: last ? 'transparent' : completed ? colors.success : 'rgba(77, 98, 87, 0.15)' },
                          ]}
                        />
                      </View>

                      {/* Stage Information */}
                      <View style={[styles.stageBody, locked && { opacity: 0.55 }]}>
                        <View style={styles.row}>
                          <Text style={[styles.stageTitle, isActive && { color: colors.primary, fontFamily: fonts.bold }]}>
                            {STAGE_LABELS[key]}
                          </Text>
                          {isActive && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>CURRENT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.stageDesc}>{info.text}</Text>
                      </View>

                      {/* Status Action Indicator */}
                      <View style={styles.statusCol}>
                        {isActive ? (
                          <View style={styles.activeArrowCircle}>
                            <Ionicons name="chevron-forward" size={16} color="#fff" />
                          </View>
                        ) : (
                          <Text style={[styles.statusText, completed && { color: colors.success, fontFamily: fonts.semibold }]}>
                            {completed ? 'Done' : 'Locked'}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Setu AI Coach Footer Prompt */}
            <Pressable
              style={[styles.coachPromo, shadow.card]}
              onPress={() => navigation.navigate('Guide')}
            >
              <View style={styles.coachPromoLeft}>
                <Text style={styles.coachPromoTitle}>Need help discussing a sensitive topic?</Text>
                <Text style={styles.coachPromoSub}>Ask Setu Guide for private, tailored advice before your next talk.</Text>
              </View>
              <View style={styles.coachPromoBtn}>
                <Text style={styles.coachPromoBtnText}>Ask Guide</Text>
                <Ionicons name="sparkles" size={13} color="#fff" style={{ marginLeft: 4 }} />
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg, // Mint Green: #C0E1CF
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card, // Soft Cream: #FDF4F2
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 16.5,
    color: colors.text,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },

  matchCard: {
    backgroundColor: colors.card, // Soft Cream
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  matchName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  matchSub: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  connectedBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: '#fff',
  },
  menuPopover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  menuPopoverText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardSecondary, // Sage Mint: #DFEBE1
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(77, 98, 87, 0.12)',
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.text,
  },
  bannerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },

  stepperContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepperHeading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  stepperSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },

  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  stageRowActive: {
    backgroundColor: 'rgba(208, 109, 148, 0.08)',
    borderRadius: radius.md,
    paddingHorizontal: 4,
  },
  railCol: {
    width: 32,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  railLine: {
    width: 2,
    flex: 1,
  },
  nodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  stageBody: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
  },
  stageTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  currentBadge: {
    marginLeft: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  currentBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#fff',
  },
  stageDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statusCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  activeArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.muted,
  },

  coachPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  coachPromoLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  coachPromoTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  coachPromoSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  coachPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  coachPromoBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
