import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

type Props = {
  uri?: string;
  name?: string;
  size?: number;
  online?: boolean;
  verified?: boolean;
  shape?: 'circle' | 'rounded';
};

// 4 gradient pairs from the design palette
const GRADIENT_PAIRS: [string, string][] = [
  ['#FAC6D6', '#D06D94'], // Blush → Rose
  ['#DFEBE1', '#4D6257'], // Sage → Forest
  ['#FCE7EE', '#B8557B'], // Soft Rose → Deep Rose
  ['#C0E1CF', '#2E7D5B'], // Mint → Success
];

function pickGradient(name: string): [string, string] {
  const hash = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
}

export default function Avatar({ uri, name, size = 48, online, verified, shape = 'circle' }: Props) {
  const photoUrl = uri && typeof uri === 'string' && uri.trim().length > 0 ? uri.trim() : undefined;
  const initial = name?.trim().charAt(0).toUpperCase();
  const [gradFrom, gradTo] = name ? pickGradient(name) : ['#FAC6D6', '#D06D94'];
  const borderRadius = shape === 'circle' ? size / 2 : 14;
  const dotSize = Math.max(10, size * 0.26);
  const badgeSize = Math.max(14, size * 0.32);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={[
            styles.img,
            {
              width: size,
              height: size,
              borderRadius,
              borderWidth: 2,
              borderColor: '#D06D94', // rose pink ring
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[gradFrom, gradTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fallback, { width: size, height: size, borderRadius }]}
        >
          {initial ? (
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: size * 0.42,
                color: '#fff',
                textShadowColor: 'rgba(0,0,0,0.18)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {initial}
            </Text>
          ) : (
            <Ionicons name="person" size={size * 0.5} color="#fff" />
          )}
        </LinearGradient>
      )}

      {/* Glowing online indicator */}
      {online && (
        <View
          style={[
            styles.onlineWrap,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <View
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: '#10B981',
              borderWidth: 2,
              borderColor: '#fff',
              shadowColor: '#10B981',
              shadowOpacity: 0.7,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </View>
      )}

      {/* Polished verified badge */}
      {verified && (
        <View
          style={[
            styles.verifiedWrap,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
          ]}
        >
          <LinearGradient
            colors={['#D06D94', '#B8557B']}
            style={{
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={badgeSize * 0.58} color="#fff" />
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: colors.cardSecondary,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineWrap: {
    position: 'absolute',
  },
  verifiedWrap: {
    position: 'absolute',
    right: -3,
    top: -3,
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 999,
    shadowColor: '#D06D94',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});
