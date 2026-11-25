import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import AppBackground from '../../components/AppBackground';
import AppLogo from '../../components/AppLogo';
import { getDiscover, getHome, sendInterest } from '../../services/api';
import { Person, StageKey, STAGE_LABELS } from '../../services/mockData';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 440);

// Gradient pairs for monogram cards (name-hash based)
const MONO_GRADIENTS: [string, string][] = [
  ['#FAC6D6', '#D06D94'],
  ['#DFEBE1', '#4D6257'],
  ['#FCE7EE', '#B8557B'],
  ['#C0E1CF', '#2E7D5B'],
];
function pickMonoGradient(name: string): [string, string] {
  const hash = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return MONO_GRADIENTS[hash % MONO_GRADIENTS.length];
}

// ─── Shimmer Loading Skeleton ───────────────────────────────────────────────
function ShimmerSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.95] });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <LinearGradient
        colors={['#DFEBE1', '#C0E1CF', '#FAC6D6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Pulsing circle */}
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonBar1} />
      <View style={styles.skeletonBar2} />
      <View style={styles.skeletonBar3} />
      <Text style={styles.skeletonCaption}>Finding your perfect match…</Text>
    </Animated.View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onRefresh, heartAnim }: { onRefresh: () => void; heartAnim: Animated.Value }) {
  const scale = heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });

  return (
    <View style={styles.emptyDeck}>
      <LinearGradient
        colors={['rgba(208,109,148,0.18)', 'rgba(192,225,207,0.18)']}
        style={styles.emptyGradientBg}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={['#D06D94', '#B8557B']}
          style={styles.emptyHeartCircle}
        >
          <Ionicons name="heart" size={44} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.emptyTitle}>You're All Caught Up! 💕</Text>
      <Text style={styles.emptyDesc}>
        You've seen everyone nearby. New profiles appear daily — come back soon or refresh to rediscover!
      </Text>
      <Pressable onPress={onRefresh}>
        <LinearGradient colors={['#D06D94', '#B8557B']} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.refreshBtnText}>Check Again</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── CardVisual ───────────────────────────────────────────────────────────────
function CardVisual({ person, onInfoPress }: { person: Person; onInfoPress: () => void }) {
  const onlineAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if ((person as any).online) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(onlineAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(onlineAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [onlineAnim, (person as any).online]);

  if (!person) return null;

  const [gradFrom, gradTo] = pickMonoGradient(person.name || 'A');

  return (
    <View style={styles.cardInner}>
      {/* Photo or Gradient Monogram */}
      {person.photo ? (
        <Image source={{ uri: person.photo }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[gradFrom, gradTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.monogramBg}
        >
          {/* Large centered gradient monogram circle */}
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)']}
            style={styles.monogramCircle}
          >
            <Text style={styles.monogramInitial}>
              {person.name?.trim().charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          {/* Verified badge pill */}
          <View style={styles.verifiedTagRow}>
            <LinearGradient colors={['#D06D94', '#B8557B']} style={styles.verifiedTagPill}>
              <Ionicons name="checkmark-circle" size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.verifiedTagText}>Verified Profile</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      )}

      {/* Bottom overlay gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(20,30,25,0.55)', 'rgba(10,18,14,0.92)']}
        locations={[0, 0.45, 1]}
        style={styles.cardGradientOverlay}
      >
        {/* Name / Age row */}
        <View style={styles.cardHeaderLine}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameVerifiedRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {person.name}{person.age ? `, ${person.age}` : ''}
              </Text>
              {/* Online pulsing dot */}
              {(person as any).online && (
                <Animated.View style={[styles.onlineDot, { opacity: onlineAnim }]} />
              )}
              <Ionicons name="checkmark-circle" size={20} color="#D06D94" style={{ marginLeft: 6 }} />
            </View>
            {/* Location */}
            <Text style={styles.locationLine} numberOfLines={1}>
              <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.75)" />
              {'  '}{person.location || 'India'}
            </Text>
          </View>

          {/* Info button */}
          <Pressable
            style={styles.infoCircleBtn}
            onPress={onInfoPress}
            hitSlop={8}
            accessibilityLabel="View full profile"
          >
            <Ionicons name="information" size={19} color="#fff" />
          </Pressable>
        </View>

        {/* Profession & Education chips */}
        <View style={styles.pillsRow}>
          {!!person.profession && (
            <View style={styles.glassChip}>
              <Ionicons name="briefcase" size={11} color="#fff" style={{ marginRight: 3 }} />
              <Text style={styles.glassChipText} numberOfLines={1}>{person.profession}</Text>
            </View>
          )}
          {!!person.education && (
            <View style={styles.glassChip}>
              <Ionicons name="school" size={11} color="#fff" style={{ marginRight: 3 }} />
              <Text style={styles.glassChipText} numberOfLines={1}>{person.education}</Text>
            </View>
          )}
        </View>

        {/* Bio snippet */}
        {!!person.bio && (
          <View style={styles.bioSnippetBox}>
            <Text style={styles.bioSnippetText} numberOfLines={2}>"{person.bio}"</Text>
          </View>
        )}

        {/* Interest pills */}
        {Array.isArray(person.interests) && person.interests.length > 0 && (
          <View style={styles.interestsRow}>
            {person.interests.slice(0, 3).map((item: string, i: number) => (
              <View key={i} style={styles.interestPill}>
                <Text style={styles.interestPillText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConn, setActiveConn] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animations
  const position = useRef(new Animated.ValueXY()).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const pillGlow = useRef(new Animated.Value(0.6)).current;

  // Brand heart pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Empty state heart pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, [heartAnim]);

  // Active connection pill glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pillGlow, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pillGlow, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [pillGlow]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [discoverRes, homeRes] = await Promise.all([
        getDiscover().catch(() => []),
        getHome().catch(() => null),
      ]);
      setPeople(discoverRes);
      setCurrentIndex(0);
      setHistory([]);
      if (homeRes) {
        setActiveConn(homeRes.currentConnection);
        setUnreadCount(homeRes.unreadNotifications || 0);
      }
    } catch (e) {
      console.warn('Discover load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ─── PanResponder ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeCard('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeCard('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const swipeCard = (direction: 'left' | 'right' | 'super') => {
    const x =
      direction === 'right'
        ? SCREEN_WIDTH + 100
        : direction === 'left'
        ? -SCREEN_WIDTH - 100
        : 0;
    const y = direction === 'super' ? -SCREEN_HEIGHT : 0;
    Animated.timing(position, {
      toValue: { x, y },
      duration: 260,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'left' | 'right' | 'super') => {
    const currentPerson = people[currentIndex];
    if (direction === 'right' || direction === 'super') {
      if (currentPerson) sendInterest(currentPerson).catch(() => {});
    }
    setHistory((prev) => [...prev, currentIndex]);
    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const handleRewind = () => {
    if (history.length === 0) return;
    const lastIndex = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(lastIndex);
    position.setValue({ x: 0, y: 0 });
  };

  const openFullProfile = (person: Person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  const currentPerson = people[currentIndex];

  // ─── Interpolations ───────────────────────────────────────────────────────
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-20deg', '0deg', '20deg'],
    extrapolate: 'clamp',
  });

  // 3D Y-axis tilt using perspective + rotateY
  const rotateY = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-6deg', '0deg', '6deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  // Shadow color shift: default → rose (right), default → red (left)
  const cardShadowOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.35, 0.12, 0.35],
    extrapolate: 'clamp',
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.rootContainer}>
      {/* Atmospheric Dating Background Wallpaper */}
      <AppBackground opacity={0.38} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileAvatarBtn}
            accessibilityLabel="My Profile"
          >
            <Avatar size={38} uri={(user as any)?.avatar} name={user?.name || 'Me'} />
          </Pressable>

          <View style={styles.brandTitleWrap}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <AppLogo size={28} style={{ marginRight: 6 }} />
            </Animated.View>
            <Text style={styles.brandName}>SAMBANDH</Text>
          </View>

          <Pressable
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {unreadCount > 0 && <View style={styles.topBadge} />}
          </Pressable>
        </View>

        {/* ── Active Connection Pill ───────────────────────────────────────── */}
        {activeConn && (
          <Pressable
            onPress={() => navigation.navigate('Journey')}
            accessibilityLabel="Active Journey"
          >
            <Animated.View
              style={[
                styles.activePill,
                {
                  shadowOpacity: pillGlow.interpolate({
                    inputRange: [0.6, 1],
                    outputRange: [0.18, 0.42],
                  }) as any,
                },
              ]}
            >
              <LinearGradient
                colors={['#D06D94', '#B8557B']}
                style={styles.activePillIcon}
              >
                <Ionicons name="infinite" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.activePillText} numberOfLines={1}>
                Journey with{' '}
                <Text style={{ fontFamily: fonts.bold }}>{activeConn.name}</Text>
                {'  ·  '}
                {STAGE_LABELS[activeConn.stage as StageKey] || 'Connect'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </Animated.View>
          </Pressable>
        )}

        {/* ── Card Deck ───────────────────────────────────────────────────── */}
        <View style={styles.deckContainer}>
          {loading ? (
            <ShimmerSkeleton />
          ) : currentIndex >= people.length ? (
            <EmptyState onRefresh={loadData} heartAnim={heartAnim} />
          ) : (
            <View style={styles.stackWrapper}>
              {/* Next card (behind) */}
              {people[currentIndex + 1] && (
                <Animated.View
                  style={[
                    styles.card,
                    styles.nextCard,
                    { transform: [{ scale: nextCardScale }] },
                  ]}
                >
                  <CardVisual
                    person={people[currentIndex + 1]}
                    onInfoPress={() => openFullProfile(people[currentIndex + 1])}
                  />
                </Animated.View>
              )}

              {/* Active swipeable card */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.card,
                  {
                    transform: [
                      { perspective: 1200 },
                      { translateX: position.x },
                      { translateY: position.y },
                      { rotate },
                      { rotateY },
                    ],
                    shadowColor: '#D06D94',
                    shadowOpacity: cardShadowOpacity as any,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 10,
                  },
                ]}
              >
                {/* LIKE stamp */}
                <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
                  <Text style={styles.likeStampText}>LIKE</Text>
                </Animated.View>

                {/* NOPE stamp */}
                <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
                  <Text style={styles.nopeStampText}>NOPE</Text>
                </Animated.View>

                <CardVisual
                  person={currentPerson}
                  onInfoPress={() => openFullProfile(currentPerson)}
                />
              </Animated.View>
            </View>
          )}
        </View>

        {/* ── Floating Action Dock ─────────────────────────────────────────── */}
        {currentIndex < people.length && !loading && (
          <View style={styles.actionDockWrapper}>
            <View style={styles.actionDock}>
              {/* Rewind */}
              <Pressable
                style={[styles.dockBtn, styles.rewindBtn]}
                onPress={handleRewind}
                disabled={history.length === 0}
                accessibilityLabel="Undo last swipe"
              >
                <Ionicons
                  name="arrow-undo"
                  size={19}
                  color={history.length > 0 ? '#E67E22' : colors.disabledText}
                />
              </Pressable>

              {/* Pass (Nope) */}
              <Pressable
                style={[styles.dockBtn, styles.passBtn]}
                onPress={() => swipeCard('left')}
                accessibilityLabel="Pass"
              >
                <LinearGradient
                  colors={['#FFF5F5', '#FFE3E3']}
                  style={styles.dockBtnGradient}
                >
                  <Ionicons name="close" size={28} color={colors.danger} />
                </LinearGradient>
              </Pressable>

              {/* Super Like */}
              <Pressable
                style={[styles.dockBtn, styles.superBtn]}
                onPress={() => swipeCard('super')}
                accessibilityLabel="Super Like"
              >
                <Ionicons name="star" size={20} color="#D97706" />
              </Pressable>

              {/* Like */}
              <Pressable
                style={[styles.dockBtn, styles.likeBtn]}
                onPress={() => swipeCard('right')}
                accessibilityLabel="Send Interest"
              >
                <LinearGradient
                  colors={['#D06D94', '#B8557B']}
                  style={styles.dockBtnGradient}
                >
                  <Ionicons name="heart" size={30} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Full Profile Modal ───────────────────────────────────────────── */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafe}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Full Profile</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={23} color={colors.text} />
              </Pressable>
            </View>

            {selectedPerson && (
              <ScrollView
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Photo / Monogram hero */}
                <View style={styles.modalPhotoBox}>
                  {selectedPerson.photo ? (
                    <Image
                      source={{ uri: selectedPerson.photo }}
                      style={styles.modalImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={pickMonoGradient(selectedPerson.name || 'A')}
                      style={styles.modalPlaceholder}
                    >
                      <Text style={styles.modalInitials}>
                        {selectedPerson.name?.trim().charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(10,18,14,0.82)']}
                    style={styles.modalPhotoOverlay}
                  >
                    <Text style={styles.modalName}>
                      {selectedPerson.name}
                      {selectedPerson.age ? `, ${selectedPerson.age}` : ''}
                    </Text>
                    <Text style={styles.modalSub}>
                      <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.8)" />
                      {'  '}
                      {selectedPerson.location || 'India'}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Bio */}
                {!!selectedPerson.bio && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeading}>About Me</Text>
                    <Text style={styles.modalBioText}>{selectedPerson.bio}</Text>
                  </View>
                )}

                {/* Background */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionHeading}>Background</Text>
                  {!!selectedPerson.profession && (
                    <View style={styles.detailRow}>
                      <Ionicons name="briefcase-outline" size={17} color={colors.primary} />
                      <Text style={styles.detailText}>{selectedPerson.profession}</Text>
                    </View>
                  )}
                  {!!selectedPerson.education && (
                    <View style={styles.detailRow}>
                      <Ionicons name="school-outline" size={17} color={colors.primary} />
                      <Text style={styles.detailText}>{selectedPerson.education}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={17} color={colors.primary} />
                    <Text style={styles.detailText}>{selectedPerson.location || 'India'}</Text>
                  </View>
                </View>

                {/* Interests */}
                {Array.isArray(selectedPerson.interests) &&
                  selectedPerson.interests.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionHeading}>Interests & Passions</Text>
                      <View style={styles.tagsWrapper}>
                        {selectedPerson.interests.map((tag: string, i: number) => (
                          <View key={i} style={styles.modalTagPill}>
                            <Text style={styles.modalTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    height: 54,
  },
  profileAvatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 2.5,
    color: colors.primary,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(253,244,242,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // ── Active Connection Pill
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253,244,242,0.95)',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(208,109,148,0.3)',
    gap: 8,
    shadowColor: '#D06D94',
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  activePillIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },

  // ── Deck / Stack
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  stackWrapper: {
    width: SCREEN_WIDTH - spacing.md * 2,
    height: CARD_HEIGHT,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: colors.card,
    overflow: 'hidden',
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(208,109,148,0.12)',
  },
  nextCard: {
    transform: [{ scale: 0.94 }],
    opacity: 0.82,
  },
  cardInner: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },

  // Gradient monogram (no-photo)
  monogramBg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 160,
  },
  monogramCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  monogramInitial: {
    fontFamily: fonts.display,
    fontSize: 54,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  verifiedTagRow: {
    marginTop: 16,
  },
  verifiedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  verifiedTagText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#fff',
  },

  // ── Card bottom gradient overlay
  cardGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    marginLeft: 8,
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  locationLine: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  infoCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassChipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#fff',
  },
  bioSnippetBox: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  bioSnippetText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  interestsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
    flexWrap: 'wrap',
  },
  interestPill: {
    backgroundColor: 'rgba(208,109,148,0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  interestPillText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: '#fff',
  },

  // ── Swipe Stamps
  stamp: {
    position: 'absolute',
    top: 42,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 5,
    zIndex: 999,
  },
  likeStamp: {
    left: 24,
    borderColor: '#10B981',
    transform: [{ rotate: '-20deg' }],
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  likeStampText: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: '#10B981',
    letterSpacing: 3,
  },
  nopeStamp: {
    right: 24,
    borderColor: colors.danger,
    transform: [{ rotate: '20deg' }],
    backgroundColor: 'rgba(224,72,90,0.08)',
  },
  nopeStampText: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.danger,
    letterSpacing: 3,
  },

  // ── Shimmer Skeleton
  skeletonCard: {
    width: SCREEN_WIDTH - spacing.md * 2,
    height: CARD_HEIGHT,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  skeletonCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  skeletonBar1: {
    width: '55%',
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  skeletonBar2: {
    width: '38%',
    height: 13,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  skeletonBar3: {
    width: '45%',
    height: 13,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  skeletonCaption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(77,98,87,0.75)',
    marginTop: 10,
  },

  // ── Empty State
  emptyDeck: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    height: CARD_HEIGHT,
    width: SCREEN_WIDTH - spacing.md * 2,
    borderRadius: 26,
    overflow: 'hidden',
  },
  emptyGradientBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 26,
  },
  emptyHeartCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#D06D94',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
    shadowColor: '#D06D94',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  refreshBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },

  // ── Action Dock
  actionDockWrapper: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 84 : 76,
    paddingTop: spacing.xs,
    zIndex: 10,
  },
  actionDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(208, 109, 148, 0.16)',
    shadowColor: '#243B36',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dockBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dockBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  rewindBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(230, 126, 34, 0.3)',
    shadowColor: '#E67E22',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  passBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(224, 72, 90, 0.25)',
    shadowColor: colors.danger,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  likeBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 0,
    shadowColor: '#D06D94',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  superBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    shadowColor: '#D97706',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Profile Modal
  modalSafe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: spacing.lg,
  },
  modalPhotoBox: {
    width: '100%',
    height: 290,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.cardSecondary,
    marginBottom: spacing.lg,
  },
  modalImg: {
    width: '100%',
    height: '100%',
  },
  modalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInitials: {
    fontFamily: fonts.display,
    fontSize: 72,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  modalPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalName: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: '#fff',
  },
  modalSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  modalSection: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  modalSectionHeading: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  modalBioText: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  detailText: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.text,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTagPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(208,109,148,0.2)',
  },
  modalTagText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
});
