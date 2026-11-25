import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, space, TintName } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { Button } from './Button';
import type { IconName } from './Basics';

const webInput: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

/** Bottom sheet on phones, centred dialog on desktop. */
export function Sheet({ visible, onClose, children, title, maxWidth = 460 }: { visible: boolean; onClose: () => void; children: React.ReactNode; title?: string; maxWidth?: number }) {
  const { wide } = useLayout();
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.backdrop, wide ? styles.center : styles.bottom]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, wide ? [styles.dialog, { maxWidth }] : styles.bottomSheet]} accessibilityViewIsModal>
          {title ? (
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.close}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function SelectSheet({ visible, title, options, value, onSelect, onClose, allowCustom = false, customLabel = 'Enter manually', customPlaceholder = 'Enter a value', customKeyboardType, customMaxLength }: {
  visible: boolean; title: string; options: { value: string; label: string; description?: string }[]; value: string; onSelect: (v: string) => void; onClose: () => void;
  allowCustom?: boolean; customLabel?: string; customPlaceholder?: string; customKeyboardType?: TextInputProps['keyboardType']; customMaxLength?: number;
}) {
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState(value);
  const [customFocused, setCustomFocused] = useState(false);
  useEffect(() => {
    if (visible) {
      setManualEntry(false);
      setManualValue(value);
    }
  }, [visible, value]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: space.lg }}>
        {manualEntry ? (
          <View>
            <TextInput
              value={manualValue}
              onChangeText={setManualValue}
              placeholder={customPlaceholder}
              keyboardType={customKeyboardType}
              maxLength={customMaxLength}
              accessibilityLabel={customLabel}
              onFocus={() => setCustomFocused(true)}
              onBlur={() => setCustomFocused(false)}
              style={[styles.customInput, webInput, customFocused && styles.customInputFocused]}
            />
            <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
              <View style={{ flex: 1 }}><Button title="Back to options" variant="ghost" size="sm" onPress={() => setManualEntry(false)} /></View>
              <View style={{ flex: 1 }}><Button title="Use value" size="sm" onPress={() => onSelect(manualValue.trim())} disabled={!manualValue.trim()} /></View>
            </View>
          </View>
        ) : (
          <>
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Pressable key={o.value} onPress={() => onSelect(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  style={({ hovered }: any) => [styles.option, on && { backgroundColor: colors.primarySoft }, hovered && !on && { backgroundColor: colors.primarySoft }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, on && { color: colors.primary, fontFamily: fonts.semibold }]}>{o.label}</Text>
                    {o.description ? <Text style={styles.optionDesc}>{o.description}</Text> : null}
                  </View>
                  {on ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
            {allowCustom ? (
              <Pressable onPress={() => setManualEntry(true)} accessibilityRole="button"
                style={({ hovered }: any) => [styles.option, hovered && { backgroundColor: colors.primarySoft }]}>
                <View style={{ flex: 1 }}><Text style={styles.customOptionText}>{customLabel}</Text></View>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

/** Confirmation dialog ("Remove Family Member?", "Unblock User?", "Delete conversation?"). */
export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, destructive, icon = 'alert-circle-outline', tint, busy }: {
  visible: boolean; title: string; message?: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean; icon?: IconName; tint?: TintName; busy?: boolean;
}) {
  const t = colors.tint[tint || (destructive ? 'red' : 'blue')];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, styles.center]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={[styles.sheet, styles.dialog, { maxWidth: 400, alignItems: 'center' }]} accessibilityViewIsModal accessibilityRole="alert">
          <Pressable onPress={onCancel} style={[styles.close, { position: 'absolute', right: 12, top: 12 }]} accessibilityLabel="Close"><Ionicons name="close" size={20} color={colors.muted} /></Pressable>
          <View style={[styles.confirmIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={26} color={t.fg} /></View>
          <Text style={styles.confirmTitle}>{title}</Text>
          {message ? <Text style={styles.confirmMsg}>{message}</Text> : null}
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: space.lg }}>
            <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} />
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------- Toast ----------------

type ToastCtx = { show: (message: string, tone?: 'success' | 'error' | 'info') => void };
const ToastContext = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: string } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);
  const show = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, tone });
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setToast(null)), 2600);
  }, [opacity]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity }]} accessibilityLiveRegion="polite">
          <View style={[styles.toast, toast.tone === 'error' && { backgroundColor: '#7F1D1D' }]}>
            <Ionicons name={toast.tone === 'error' ? 'alert-circle' : toast.tone === 'info' ? 'information-circle' : 'checkmark-circle'} size={18} color="#fff" />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.lg },
  bottom: { justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, ...shadow.modal },
  dialog: { width: '100%' as any, borderRadius: radius.lg, padding: space.xl },
  bottomSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: space.lg, paddingBottom: space.xxl },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, flex: 1 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12, borderRadius: radius.sm },
  optionText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  optionDesc: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  customOptionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  customInput: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  customInputFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  confirmIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  confirmTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.text, textAlign: 'center' },
  confirmMsg: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 8 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 110, alignItems: 'center', paddingHorizontal: 16 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, maxWidth: 520, ...shadow.elevated },
  toastText: { fontFamily: fonts.medium, fontSize: 14, color: '#fff', flexShrink: 1 },
});
