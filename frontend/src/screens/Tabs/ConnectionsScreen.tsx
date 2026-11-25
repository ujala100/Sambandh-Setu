import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import AppBackground from '../../components/AppBackground';
import AppLogo from '../../components/AppLogo';
import Skeleton from '../../components/Skeleton';
import { getChats } from '../../services/chatApi';
import {
  acceptRequest,
  declineRequest,
  getActive,
  getPaused,
  getReceived,
  getSent,
  resumeConnection,
  withdrawRequest,
} from '../../services/api';
import {
  Connection,
  PausedConnection,
  ReceivedRequest,
  SentRequest,
  STAGE_LABELS,
} from '../../services/mockData';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

type Tab = 'matches' | 'received' | 'sent';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Stage Pill Colors ───────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  connect:       { bg: '#FAC6D6', text: '#D06D94' },
  understand:    { bg: '#DFEBE1', text: '#2E7D5B' },
  reflect:       { bg: '#FDE8B2', text: '#B45309' },
  discuss:       { bg: '#DDE8FC', text: '#3B5EC6' },
  agree:         { bg: '#DFEBE1', text: '#2E7D5B' },
  family:        { bg: '#FAC6D6', text: '#D06D94' },
  reflect_again: { bg: '#FDE8B2', text: '#B45309' },
  decision:      { bg: '#D06D94', text: '#fff' },
};

// ─── Animated Waiting Dots ────────────────────────────────────────────────────
function WaitingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, opacity: dot }} />
      ))}
      <Text style={styles.waitingText}>Waiting...</Text>
    </View>
  );
}

// ─── Animated Heart Header ────────────────────────────────────────────────────
function HeartIcon() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="heart" size={22} color="#fff" />
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function PremiumEmptyState({ icon, title, description, actionLabel, onAction }: {
  icon: string; title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.emptyWrap}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <LinearGradient colors={['#FAC6D6', '#D06D94']} style={styles.emptyIconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={icon as any} size={34} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <LinearGradient colors={['#D06D94', '#B8557B']} style={styles.emptyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.emptyBtnText}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ConnectionsScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<Tab>('matches');
  const [active, setActive] = useState<Connection[]>([]);
  const [received, setReceived] = useState<ReceivedRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);
  const [paused, setPaused] = useState<PausedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Animated tab indicator
  const tabAnim = useRef(new Animated.Value(0)).current;
  const tabOrder: Tab[] = ['matches', 'received', 'sent'];

  const animateTab = (t: Tab) => {
    const idx = tabOrder.indexOf(t);
    Animated.spring(tabAnim, { toValue: idx, useNativeDriver: true, friction: 7, tension: 60 }).start();
    setTab(t);
  };

  const loadData = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    try {
      const [act, rec, snt, psd] = await Promise.all([
        getActive().catch(() => []),
        getReceived().catch(() => []),
        getSent().catch(() => []),
        getPaused().catch(() => []),
      ]);
      setActive(act);
      setReceived(rec);
      setSent(snt);
      setPaused(psd);
    } catch (e) {
      console.warn('Load connections error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    if (route.params?.tab) {
      if (route.params.tab === 'requests') animateTab('received');
      else if (route.params.tab === 'active') animateTab('matches');
      navigation.setParams({ tab: undefined });
    }
  }, [route.params?.tab, navigation]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    if (busyKey !== null) return;
    setBusyKey(key);
    try {
      await fn();
      await loadData(true);
    } catch {
      Alert.alert('Notice', 'Action could not be completed. Check your internet connection.');
    }
    setBusyKey(null);
  };

  const openProfile = (person: any) => navigation.navigate('ProfileDetail', { personId: person.id });

  // Tab pill width
  const TAB_W = (SCREEN_W - spacing.lg * 2 - 8) / 3;
  const pillTranslateX = tabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, TAB_W, TAB_W * 2] });

  const badges: Record<Tab, number> = { matches: active.length, received: received.length, sent: sent.length };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Atmospheric Dating Background Wallpaper */}
      <AppBackground opacity={0.32} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#D06D94', '#B8557B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerInner}>
          <AppLogo size={26} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Connections</Text>
          <HeartIcon />
        </View>
        <Pressable style={styles.chatBtn} onPress={() => navigation.navigate('Chats')} accessibilityLabel="Go to Chats">
          <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
        </Pressable>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />}
      >
        {/* ── Animated Pill Tab Bar ── */}
        <View style={styles.tabsContainer}>
          {/* Sliding gradient pill */}
          <Animated.View
            style={[styles.tabSlider, { width: TAB_W, transform: [{ translateX: pillTranslateX }] }]}
            pointerEvents="none"
          >
            <LinearGradient colors={['#D06D94', '#B8557B']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </Animated.View>

          {tabOrder.map((t) => {
            const isActive = tab === t;
            const labels: Record<Tab, string> = { matches: 'Matches', received: 'Requests', sent: 'Sent' };
            return (
              <Pressable key={t} style={[styles.tabBtn, { width: TAB_W }]} onPress={() => animateTab(t)}>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{labels[t]}</Text>
                {badges[t] > 0 && (
                  <View style={[styles.badge, isActive && styles.badgeActive]}>
                    <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{badges[t]}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Content ── */}
        {loading ? (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Skeleton height={130} />
            <Skeleton height={130} />
            <Skeleton height={130} />
          </View>
        ) : tab === 'matches' ? (
          <MatchesTab
            active={active}
            paused={paused}
            busyKey={busyKey}
            onOpenProfile={openProfile}
            onNavigate={navigation.navigate}
            onAct={act}
          />
        ) : tab === 'received' ? (
          <ReceivedTab
            received={received}
            busyKey={busyKey}
            onOpenProfile={openProfile}
            onAct={act}
            onNavigate={navigation.navigate}
          />
        ) : (
          <SentTab
            sent={sent}
            busyKey={busyKey}
            onAct={act}
            onNavigate={navigation.navigate}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Matches Tab ──────────────────────────────────────────────────────────────
function MatchesTab({ active, paused, busyKey, onOpenProfile, onNavigate, onAct }: {
  active: Connection[]; paused: PausedConnection[]; busyKey: string | null;
  onOpenProfile: (p: any) => void; onNavigate: (s: string, p?: any) => void;
  onAct: (key: string, fn: () => Promise<unknown>) => void;
}) {
  if (active.length === 0 && paused.length === 0) {
    return (
      <PremiumEmptyState
        icon="heart-outline"
        title="No connections yet"
        description="Swipe right on profiles in Discover to start your journey!"
        actionLabel="Go to Discover"
        onAction={() => onNavigate('Home')}
      />
    );
  }
  return (
    <View style={{ marginTop: spacing.sm }}>
      {active.map((c) => {
        const sc = STAGE_COLORS[c.stage] || STAGE_COLORS.connect;
        return (
          <View key={c.id} style={[styles.connectionCard, shadow.cardHover]}>
            {/* Left accent bar */}
            <LinearGradient
              colors={['#D06D94', '#FAC6D6']}
              style={styles.accentBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.connBody}>
              <Pressable style={styles.connTop} onPress={() => onOpenProfile(c)}>
                <View style={styles.avatarWrap}>
                  <Avatar size={58} uri={c.photo} name={c.name} online={c.online} />
                  {/* Stage pill overlay */}
                  <View style={[styles.stagePill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.stagePillText, { color: sc.text }]}>{STAGE_LABELS[c.stage]}</Text>
                  </View>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.connName}>{c.name}, {c.age}</Text>
                    <Ionicons name="checkmark-circle" size={15} color={colors.primary} style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.connSub}>{c.profession} · {c.location}</Text>
                  <Text style={[styles.stageLabelText, { color: sc.text }]}>Stage: {STAGE_LABELS[c.stage]}</Text>
                </View>
              </Pressable>

              <View style={styles.connActionsRow}>
                <Pressable
                  style={styles.chatIconBtn}
                  onPress={() => onNavigate('Chats')}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.journeyBtn} onPress={() => onNavigate('Journey')}>
                  <LinearGradient colors={['#D06D94', '#B8557B']} style={styles.journeyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.journeyBtnText}>Journey</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      {/* Paused Connections */}
      {paused.length > 0 && (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={styles.subHeading}>Paused Connections</Text>
          {paused.map((p) => (
            <View key={p.id} style={[styles.pausedCard, shadow.card]}>
              <View style={styles.pausedOverlay} />
              <Avatar size={44} uri={p.photo} name={p.name} />
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={styles.connName}>{p.name}, {p.age}</Text>
                <Text style={styles.connSub}>Paused on {p.pausedOn}</Text>
              </View>
              <Pressable
                style={styles.resumeBtn}
                disabled={busyKey === `${p.id}:resume`}
                onPress={() => onAct(`${p.id}:resume`, () => resumeConnection(p.id))}
              >
                {busyKey === `${p.id}:resume`
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.resumeBtnText}>Resume</Text>}
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Received Tab ─────────────────────────────────────────────────────────────
function ReceivedTab({ received, busyKey, onOpenProfile, onAct, onNavigate }: {
  received: ReceivedRequest[]; busyKey: string | null;
  onOpenProfile: (p: any) => void;
  onAct: (key: string, fn: () => Promise<unknown>) => void;
  onNavigate: (s: string, p?: any) => void;
}) {
  if (received.length === 0) {
    return (
      <PremiumEmptyState
        icon="heart-dislike-outline"
        title="No requests yet"
        description="When someone likes your profile, they'll appear here!"
      />
    );
  }
  return (
    <View style={styles.grid}>
      {received.map((r) => {
        const isBusyAccept = busyKey === `${r.id}:accept`;
        const isBusyDecline = busyKey === `${r.id}:decline`;
        return (
          <Pressable key={r.id} style={[styles.gridCard, shadow.cardHover]} onPress={() => onOpenProfile(r)}>
            {/* Avatar area */}
            <View style={styles.gridAvatarWrap}>
              {r.photo ? (
                <Image source={{ uri: r.photo }} style={styles.gridImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={['#FAC6D6', '#D06D94']} style={styles.gridFallback} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.gridInitial}>{r.name?.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
            {/* Info */}
            <View style={styles.gridInfo}>
              <Text style={styles.gridName} numberOfLines={1}>{r.name}, {r.age}</Text>
              <Text style={styles.gridProf} numberOfLines={1}>{r.profession}</Text>
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={10} color={colors.primary} />
                <Text style={styles.locationText} numberOfLines={1}>{r.location}</Text>
              </View>
            </View>
            {/* Buttons */}
            <View style={styles.gridActions}>
              <Pressable
                style={styles.declineBtn}
                disabled={isBusyAccept || isBusyDecline}
                onPress={() => onAct(`${r.id}:decline`, () => declineRequest(r.id))}
                accessibilityLabel="Decline"
              >
                {isBusyDecline
                  ? <ActivityIndicator size="small" color={colors.danger} />
                  : <Ionicons name="close" size={18} color={colors.danger} />}
              </Pressable>
              <Pressable
                style={styles.acceptBtnWrap}
                disabled={isBusyAccept || isBusyDecline}
                onPress={() => onAct(`${r.id}:accept`, () => acceptRequest(r.id))}
                accessibilityLabel="Accept"
              >
                <LinearGradient colors={['#D06D94', '#B8557B']} style={styles.acceptBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {isBusyAccept
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="heart" size={18} color="#fff" />}
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Sent Tab ─────────────────────────────────────────────────────────────────
function SentTab({ sent, busyKey, onAct, onNavigate }: {
  sent: SentRequest[]; busyKey: string | null;
  onAct: (key: string, fn: () => Promise<unknown>) => void;
  onNavigate: (s: string, p?: any) => void;
}) {
  if (sent.length === 0) {
    return (
      <PremiumEmptyState
        icon="paper-plane-outline"
        title="No pending requests"
        description="Explore profiles and send interest to people you like!"
        actionLabel="Go to Discover"
        onAction={() => onNavigate('Home')}
      />
    );
  }
  return (
    <View style={{ marginTop: spacing.sm }}>
      {sent.map((s) => (
        <View key={s.id} style={[styles.sentCard, shadow.card]}>
          <Avatar size={48} uri={s.photo} name={s.name} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={styles.connName}>{s.name}, {s.age}</Text>
            <Text style={styles.connSub}>{s.location}</Text>
            <WaitingDots />
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
          <Pressable
            style={styles.withdrawBtn}
            disabled={busyKey === `${s.id}:withdraw`}
            onPress={() => onAct(`${s.id}:withdraw`, () => withdrawRequest(s.id))}
          >
            {busyKey === `${s.id}:withdraw`
              ? <ActivityIndicator size="small" color={colors.danger} />
              : <Text style={styles.withdrawText}>Withdraw</Text>}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = (SCREEN_W - spacing.lg * 2 - 12) / 2;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.sm,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: '#fff',
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    paddingTop: spacing.sm,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
  },
  tabSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tabBtn: {
    height: 38,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  tabLabelActive: {
    fontFamily: fonts.semibold,
    color: '#fff',
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primary,
  },
  badgeTextActive: {
    color: '#fff',
  },

  // Connections card
  connectionCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  accentBar: {
    width: 5,
  },
  connBody: {
    flex: 1,
    padding: spacing.md,
  },
  connTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    position: 'relative',
  },
  stagePill: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  stagePillText: {
    fontFamily: fonts.bold,
    fontSize: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  connSub: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 1,
  },
  stageLabelText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    marginTop: 4,
  },
  connActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chatIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyBtn: {
    flex: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  journeyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  journeyBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#fff',
  },

  // Paused Card
  subHeading: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pausedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(253,244,242,0.6)',
  },
  resumeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  resumeBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },

  // Received Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.sm,
  },
  gridCard: {
    width: CARD_W,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  gridAvatarWrap: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bgSoft,
  },
  gridImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
  },
  gridFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  gridInitial: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: '#fff',
  },
  gridInfo: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  gridName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  gridProf: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  locationText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.primary,
  },
  gridActions: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnWrap: {
    flex: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  acceptBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sent Card
  sentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  waitingText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginLeft: 2,
  },
  pendingBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  pendingText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.warning,
  },
  withdrawBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.danger,
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl + spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  emptyBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#fff',
  },
});
