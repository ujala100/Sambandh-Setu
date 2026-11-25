import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const logoImg = require('../../assets/logo.png');

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export default function AppLogo({ size = 32, style, imageStyle }: Props) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={logoImg}
        style={[
          styles.logo,
          { width: size, height: size, borderRadius: size * 0.22 },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    backgroundColor: '#FFFFFF',
  },
});
