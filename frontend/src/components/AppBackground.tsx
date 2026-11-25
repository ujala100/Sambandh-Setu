import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const bgAsset = require('../../assets/dating_bg.png');

type Props = {
  opacity?: number;
  overlayGradient?: boolean;
};

export default function AppBackground({ opacity = 0.38, overlayGradient = true }: Props) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Base mint-cream tone */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#C0E1CF' }]} />

      {/* Atmospheric Dating Background Wallpaper */}
      <Image
        source={bgAsset}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="cover"
      />

      {/* Subtle soft gradient wash on top so text, cards, and avatars remain crystal clear */}
      {overlayGradient && (
        <LinearGradient
          colors={[
            'rgba(253, 244, 242, 0.45)',
            'rgba(192, 225, 207, 0.20)',
            'rgba(250, 198, 214, 0.40)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}
