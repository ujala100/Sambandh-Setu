import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

export default function OtpInput({
  value,
  onChangeText,
  length = 6,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  length?: number;
}) {
  const inputRef = useRef<any>(null);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.container}>
      <View style={styles.row} accessibilityLabel={`Code entered: ${value.length} of ${length} digits`}>
        {Array.from({ length }).map((_, i) => (
          <View key={i} style={[styles.box, i === value.length && styles.active]}>
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      {onChangeText && (
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus
          style={styles.hiddenInput}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  box: {
    flex: 1,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.card, // Soft Cream: #FDF4F2
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    borderColor: colors.primary, // Rose Pink
    backgroundColor: '#fff',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  digit: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
