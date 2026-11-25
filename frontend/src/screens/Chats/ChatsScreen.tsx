import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../components/Avatar';
import AppBackground from '../../components/AppBackground';
import AppLogo from '../../components/AppLogo';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import { ChatFilter, ChatItem, getChats } from '../../services/chatApi';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const FILTERS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'new', label: 'New' },
  { key: 'muted', label: 'Muted' },
];

// --- Animated spark story item (connected matches only) ---
function SparkItem({
  chat,
  index,
  onPress,
}: {
  chat: ChatItem;
  index: number;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: index * 70,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-30, 0],
            }),
          },
        ],
      }}
    >
      <Pressable style={styles.sparkItem} onPress={onPress}>
        {/* Gradient ring behind avatar */}
        <LinearGradient
          colors={['#D06D94', '#FAC6D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sparkRingGradient}
        >
          <View style={styles.sparkRingInner}>
            <Avatar size={48} uri={chat.photo} name={chat.name} online={chat.online} />
          </View>
        </LinearGradient>
        <Text style={styles.sparkName} numberOfLines={1}>
          {chat.name.split(' ')[0]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// --- Animated chat row ---
function ChatRow({
  item,
  index,
  onPress,
}: {
  item: ChatItem;
  index: number;
  onPress: () => void;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [
          {
            translateY: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
          { scale: pressScale },
        ],
      }}
    >
      <Pressable
        style={[styles.chatCard, shadow.card, item.unread > 0 && styles.chatCardUnread]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
      >
        {item.unread > 0 && <View style={styles.unreadLeftBorder} />}
        <Avatar size={54} uri={item.photo} name={item.name} online={item.online} />

        <View style={styles.chatInfo}>
          <View style={styles.chatTopLine}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeUnread]}>
              {item.time}
            </Text>
          </View>
          <View style={styles.chatBottomLine}>
            <Text
              style={[styles.chatLast, item.unread > 0 && styles.chatLastUnread]}
              numberOfLines={1}
            >
              {item.last}
            </Text>
            {item.muted ? (
              <Ionicons name="volume-mute-outline" size={16} color={colors.muted} />
            ) : item.unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// --- Filter chip with animated underline ---
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const underlineWidth = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(underlineWidth, {
      toValue: active ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [active]);

  return (
    <Pressable style={styles.fchip} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.ftext, active && styles.ftextOn]}>{label}</Text>
      <Animated.View
        style={[
          styles.fchipUnderline,
          {
            width: underlineWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Pressable>
  );
}

// --- Main ChatsScreen ---
export default function ChatsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searching, setSearching] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [banner, setBanner] = useState('');
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  // Search bar focus animation
  const searchBorderAnim = useRef(new Animated.Value(0)).current;
  const [searchFocused, setSearchFocused] = useState(false);

  // Header icon pulse
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearchFocus = () => {
    setSearchFocused(true);
    Animated.timing(searchBorderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.timing(searchBorderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const load = useCallback(
    async (pull = false) => {
      const id = ++requestId.current;
      if (pull) setRefreshing(true);
      else if (!hasLoaded.current) setLoading(true);
      setError(false);
      setBanner('');
      try {
        const result = await getChats(filter, debounced);
        if (id !== requestId.current) return;
        setChats(result);
        hasLoaded.current = true;
      } catch {
        if (id !== requestId.current) return;
        if (hasLoaded.current) setBanner("Couldn't refresh. Showing your last saved chats.");
        else setError(true);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [filter, debounced]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const searchBorderColor = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.6)', '#D06D94'],
  });
  const searchBorderWidth = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Atmospheric Dating Background Wallpaper */}
      <AppBackground opacity={0.32} />

      {/* Header with LinearGradient */}
      <LinearGradient
        colors={['rgba(192,225,207,0.85)', 'rgba(253,244,242,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.brandRow}>
            <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
              <AppLogo size={20} style={{ marginRight: 6 }} />
            </Animated.View>
            <Text style={styles.brandTag}>MESSAGES</Text>
          </View>
          <Text style={styles.title}>Messages</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              setSearching(!searching);
              setQuery('');
            }}
            accessibilityRole="button"
            accessibilityLabel={searching ? 'Close search' : 'Search chats'}
          >
            <Ionicons
              name={searching ? 'close-outline' : 'search-outline'}
              size={22}
              color={colors.text}
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Glassmorphism Search Bar */}
      {searching && (
        <Animated.View
          style={[
            styles.searchWrap,
            { borderColor: searchBorderColor, borderWidth: searchBorderWidth },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations by name..."
            placeholderTextColor={colors.muted}
            autoFocus
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
        </Animated.View>
      )}

      {/* Active Matches Story Row - only from real connected chats */}
      {chats.length > 0 && !searching && (
        <View style={styles.sparksSection}>
          <Text style={styles.sparksHeading}>Active Matches</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sparksScroll}
          >
            {chats.slice(0, 8).map((chat, i) => (
              <SparkItem
                key={chat.id}
                chat={chat}
                index={i}
                onPress={() =>
                  navigation.navigate('ChatThread', {
                    chatId: chat.id,
                    name: chat.name,
                    photo: chat.photo,
                    online: chat.online,
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {/* Error banner */}
      {!!banner && (
        <Pressable
          style={styles.banner}
          onPress={() => setBanner('')}
          accessibilityRole="button"
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.bannerText}>{banner}</Text>
        </Pressable>
      )}

      {/* Chat list / skeleton / error / empty */}
      {loading ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={74} />
          <Skeleton height={74} />
          <Skeleton height={74} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your chats"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={() => load()}
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {/* Gorgeous empty state */}
              <LinearGradient
                colors={['#FAC6D6', '#FDF4F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyGlowBg}
              />
              <View style={styles.emptyContent}>
                <Text style={styles.emptyHeart}>💬</Text>
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptyDesc}>
                  {debounced
                    ? 'No matching contacts found.'
                    : 'Connect with someone from Discover to begin chatting!'}
                </Text>
                <Pressable
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('Home')}
                >
                  <LinearGradient
                    colors={['#D06D94', '#FAC6D6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyBtnGradient}
                  >
                    <Text style={styles.emptyBtnText}>Discover Matches</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <ChatRow
              item={item}
              index={index}
              onPress={() =>
                navigation.navigate('ChatThread', {
                  chatId: item.id,
                  name: item.name,
                  photo: item.photo,
                  online: item.online,
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
    fontSize: 30,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77,98,87,0.1)',
  },

  // Glassmorphism search bar
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.pill,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.text,
  },

  // Sparks Story Row
  sparksSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sparksHeading: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  sparksScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  sparkItem: {
    alignItems: 'center',
    width: 64,
  },
  sparkRingGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sparkName: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.text,
    marginTop: 5,
  },

  // Filter Chips
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fchip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ftext: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.forest,
  },
  ftextOn: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  fchipUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  bannerText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.danger,
  },

  // Chat list
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  chatCardUnread: {
    borderColor: 'rgba(208, 109, 148, 0.18)',
  },
  unreadLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  chatInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  chatTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  chatTime: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.muted,
  },
  chatTimeUnread: {
    color: '#FAC6D6',
    fontFamily: fonts.semibold,
  },
  chatBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  chatLast: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    marginRight: spacing.sm,
  },
  chatLastUnread: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#fff',
  },

  // Empty state
  emptyWrap: {
    marginTop: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlowBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  emptyContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyHeart: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  emptyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#fff',
  },
});
