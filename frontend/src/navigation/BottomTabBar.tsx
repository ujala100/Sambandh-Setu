import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';

// Central Guide action
const CENTER_OPENS_CHAT = true;

type TabConfig = {
  icon: string;
  active: string;
  label: string;
  center?: boolean;
};

const TABS: Record<string, TabConfig> = {
  Home:        { icon: 'flame-outline',       active: 'flame',        label: 'Discover' },
  Connections: { icon: 'heart-outline',        active: 'heart',        label: 'Matches' },
  Journey:     { icon: 'infinite',             active: 'infinite',     label: 'Guide', center: true },
  Guide:       { icon: 'infinite',             active: 'infinite',     label: 'Guide', center: true },
  Chats:       { icon: 'chatbubbles-outline',  active: 'chatbubbles',  label: 'Messages' },
  Profile:     { icon: 'person-outline',       active: 'person',       label: 'Profile' },
};

// ─── Center (Guide) Button ───────────────────────────────────────────────────
function CenterButton({ focused, cfg, onPress }: { focused: boolean; cfg: TabConfig; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityLabel={cfg.label}
      accessibilityState={{ selected: focused }}
      style={styles.centerTabContainer}
    >
      <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
        <LinearGradient
          colors={['#D06D94', '#B8557B']}
          style={styles.centerCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="infinity" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.tabLabel, styles.centerLabel, focused && styles.tabLabelFocused]}>
        Guide
      </Text>
    </Pressable>
  );
}

// ─── Regular Tab Item ────────────────────────────────────────────────────────
function TabItem({
  focused,
  cfg,
  onPress,
}: {
  focused: boolean;
  cfg: TabConfig;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.82, duration: 75, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.12, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.0, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityLabel={cfg.label}
      accessibilityState={{ selected: focused }}
      style={styles.tab}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          focused && styles.iconWrapFocused,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={(focused ? cfg.active : cfg.icon) as any}
          size={20}
          color={focused ? colors.primary : colors.iconAccent}
        />
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          focused && styles.tabLabelFocused,
        ]}
        numberOfLines={1}
      >
        {cfg.label}
      </Text>
    </Pressable>
  );
}

// ─── Bottom Tab Bar ──────────────────────────────────────────────────────────
export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10);

  return (
    <View pointerEvents="box-none" style={[styles.outer, { bottom: bottomOffset }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === index;

          const onPress = () => {
            if (cfg.center && CENTER_OPENS_CHAT) {
              navigation.navigate('Guide' as never);
              return;
            }
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };

          if (cfg.center) {
            return (
              <CenterButton
                key={route.key}
                focused={focused}
                cfg={cfg}
                onPress={onPress}
              />
            );
          }

          return (
            <TabItem
              key={route.key}
              focused={focused}
              cfg={cfg}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  bar: {
    flexDirection: 'row',
    width: '92%',
    maxWidth: 420,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(208, 109, 148, 0.18)',
    // Elegant soft elevation
    shadowColor: '#243B36',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  // Regular Tab
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapFocused: {
    backgroundColor: 'rgba(208, 109, 148, 0.12)',
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelFocused: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },

  // Center button
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  centerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#D06D94',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  centerLabel: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
});
