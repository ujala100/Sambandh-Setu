import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, space } from '../theme';
import type { IconName } from './Basics';
import { SelectSheet } from './Overlay';

const webInput: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

export function FieldLabel({ label, required, optional, color }: { label: string; required?: boolean; optional?: boolean; color?: string }) {
  return (
    <Text style={[styles.label, color && { color }]}>
      {label}
      {required ? <Text style={{ color: colors.dangerStrong }}> *</Text> : null}
      {optional ? <Text style={styles.optional}> (optional)</Text> : null}
    </Text>
  );
}

type FieldPalette = {
  text?: string;
  label?: string;
  border?: string;
  focusBorder?: string;
  surface?: string;
  placeholder?: string;
  icon?: string;
  helper?: string;
};

type FieldProps = TextInputProps & {
  label?: string; required?: boolean; optional?: boolean; helper?: string; error?: string | null; icon?: IconName;
  right?: React.ReactNode; containerStyle?: StyleProp<ViewStyle>; counter?: number; palette?: FieldPalette;
};

/** Input field (radius/input 10px) with label, helper text and inline error. */
export const TextField = React.forwardRef<any, FieldProps>(function TextField(
  { label, required, optional, helper, error, icon, right, containerStyle, counter, multiline, style, onFocus, onBlur, palette, ...rest }, ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: space.lg }, containerStyle]}>
      {label ? <FieldLabel label={label} required={required} optional={optional} color={palette?.label} /> : null}
      <View style={[
        styles.box,
        palette && { backgroundColor: palette.surface, borderColor: palette.border },
        multiline && styles.boxMulti,
        focused && (palette ? { borderColor: palette.focusBorder || colors.primary, borderWidth: 1.5 } : styles.boxFocus),
        !!error && styles.boxError,
      ]}>
        {icon ? <Ionicons name={icon} size={18} color={palette?.icon || colors.faint} style={{ marginRight: 10, marginTop: multiline ? 12 : 0 }} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={palette?.placeholder || colors.faint}
          multiline={multiline}
          accessibilityLabel={label || rest.placeholder}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, palette && { color: palette.text }, multiline && styles.inputMulti, webInput, style]}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : helper || counter !== undefined ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={[styles.helper, palette?.helper && { color: palette.helper }]}>{helper || ''}</Text>
          {counter !== undefined ? <Text style={[styles.helper, palette?.helper && { color: palette.helper }]}>{String(rest.value || '').length}/{counter}</Text> : null}
        </View>
      ) : null}
    </View>
  );
});

export function PasswordField(props: FieldProps) {
  const [show, setShow] = useState(false);
  const { palette } = props;
  return (
    <TextField
      icon="lock-closed-outline"
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      right={
        <Pressable onPress={() => setShow((s) => !s)} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={palette?.icon || colors.muted} />
        </Pressable>
      }
    />
  );
}

/** "+91" Indian mobile number input from "04 · Forms & Chips". */
export function PhoneField({ value, onChangeText, label = 'Mobile number', optional, required, error, helper, palette }: { value: string; onChangeText: (v: string) => void; label?: string; optional?: boolean; required?: boolean; error?: string | null; helper?: string; palette?: FieldPalette }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.lg }}>
      <FieldLabel label={label} optional={optional} required={required} color={palette?.label} />
      <View style={[
        styles.box,
        { paddingLeft: 0 },
        palette && { backgroundColor: palette.surface, borderColor: palette.border },
        focused && (palette ? { borderColor: palette.focusBorder || colors.primary, borderWidth: 1.5 } : styles.boxFocus),
        !!error && styles.boxError,
      ]}>
        <View style={[styles.cc, palette && { backgroundColor: palette.surface, borderRightColor: palette.border }]}>
          <Text style={[styles.ccText, palette && { color: palette.label || palette.text }]}>+91</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d ]/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder="Enter 10-digit number"
          placeholderTextColor={palette?.placeholder || colors.faint}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, palette && { color: palette.text }, webInput, { paddingLeft: 12 }]}
        />
      </View>
      {error ? <View style={styles.errorRow}><Ionicons name="alert-circle-outline" size={14} color={colors.danger} /><Text style={styles.error}>{error}</Text></View>
        : helper ? <Text style={[styles.helper, palette?.helper && { color: palette.helper }, { marginTop: 6 }]}>{helper}</Text> : null}
    </View>
  );
}

/** Six boxes for a 6-digit code. Typing goes into one hidden input so paste and autofill work. */
export function OtpInput({ value, onChange, error, autoFocus = true }: { value: string; onChange: (v: string) => void; error?: boolean; autoFocus?: boolean }) {
  const ref = useRef<any>(null);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ alignSelf: 'center' }} accessibilityLabel="Verification code">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {digits.map((d, i) => {
          const active = i === Math.min(value.length, 5);
          return (
            <View key={i} style={[styles.otpBox, d.trim() && styles.otpFilled, active && styles.boxFocus, error && styles.boxError]}>
              <Text style={styles.otpText}>{d.trim()}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={6}
        style={styles.hiddenInput}
        accessibilityLabel="Enter the 6-digit code"
      />
    </Pressable>
  );
}

/** DD/MM/YYYY input that stores YYYY-MM-DD. */
export function DateField({ label = 'Date of birth', value, onChange, error, required, helper, palette }: { label?: string; value: string; onChange: (iso: string) => void; error?: string | null; required?: boolean; helper?: string; palette?: FieldPalette }) {
  const toDisplay = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);
  const [text, setText] = useState(toDisplay(value));
  const change = (t: string) => {
    const d = t.replace(/\D/g, '').slice(0, 8);
    const formatted = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    setText(formatted);
    onChange(d.length === 8 ? `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : formatted);
  };
  return <TextField label={label} required={required} value={text} onChangeText={change} placeholder="DD / MM / YYYY" keyboardType="number-pad" icon="calendar-outline" error={error} helper={helper} palette={palette} />;
}

/** Looks like an input; opens a list of options. */
export function SelectField({ label, value, options, onChange, placeholder = 'Select', required, optional, error, icon, title, palette, allowCustom = false, customLabel, customPlaceholder, customKeyboardType, customMaxLength, customValueSuffix }: {
  label?: string; value: string; options: (string | { value: string; label: string; description?: string })[]; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; optional?: boolean; error?: string | null; icon?: IconName; title?: string; palette?: FieldPalette;
  allowCustom?: boolean; customLabel?: string; customPlaceholder?: string; customKeyboardType?: TextInputProps['keyboardType']; customMaxLength?: number; customValueSuffix?: string;
}) {
  const [open, setOpen] = useState(false);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value) || (allowCustom && value ? { value, label: `${value}${customValueSuffix || ''}` } : undefined);
  return (
    <View style={{ marginBottom: space.lg }}>
      {label ? <FieldLabel label={label} required={required} optional={optional} color={palette?.label} /> : null}
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label || title || 'Select'}: ${current?.label || placeholder}`}
        style={({ hovered }: any) => [styles.box, palette && { backgroundColor: palette.surface, borderColor: palette.border }, hovered && { backgroundColor: colors.primarySoft, borderColor: palette?.focusBorder || colors.primaryLine }, !!error && styles.boxError]}>
        {icon ? <Ionicons name={icon} size={18} color={palette?.icon || colors.faint} style={{ marginRight: 10 }} /> : null}
        <Text style={[styles.input, { paddingVertical: 0, color: current ? (palette?.text || colors.text) : (palette?.placeholder || colors.faint) }]} numberOfLines={1}>{current?.label || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={palette?.icon || colors.muted} />
      </Pressable>
      {error ? <View style={styles.errorRow}><Ionicons name="alert-circle-outline" size={14} color={colors.danger} /><Text style={styles.error}>{error}</Text></View> : null}
      <SelectSheet visible={open} title={title || label || 'Select'} options={opts} value={value} onClose={() => setOpen(false)} onSelect={(v) => { onChange(v); setOpen(false); }}
        allowCustom={allowCustom} customLabel={customLabel} customPlaceholder={customPlaceholder} customKeyboardType={customKeyboardType} customMaxLength={customMaxLength} />
    </View>
  );
}

// ---------------- Choice controls ----------------

export function RadioRow({ label, description, selected, onPress, icon, tint, style, boxed = true, pink = false }: {
  label: string; description?: string; selected: boolean; onPress: () => void; icon?: IconName; tint?: string; style?: any; boxed?: boolean; pink?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={description ? `${label}. ${description}` : label}
      style={({ hovered }: any) => [styles.choice, boxed && styles.choiceBoxed, selected && boxed && styles.choiceOn, selected && boxed && pink && styles.pinkChoiceOn, hovered && !selected && boxed && { borderColor: colors.primaryLine, backgroundColor: colors.primarySoft }, style]}>
      {icon ? <View style={[styles.choiceIcon, { backgroundColor: selected ? '#fff' : pink ? colors.primarySoft : colors.bgTint }]}><Ionicons name={icon} size={18} color={tint || (pink ? colors.primaryText : colors.primary)} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.choiceLabel, selected && { color: colors.text }]}>{label}</Text>
        {description ? <Text style={styles.choiceDesc}>{description}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn, selected && pink && styles.pinkRadioOn]}>{selected ? <View style={[styles.radioDot, pink && styles.pinkRadioDot]} /> : null}</View>
    </Pressable>
  );
}

export function CheckRow({ label, description, checked, onPress, icon, boxed = true, style, disabled, pink = false }: { label: string; description?: string; checked: boolean; onPress: () => void; icon?: IconName; boxed?: boolean; style?: any; disabled?: boolean; pink?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }}
      style={({ hovered }: any) => [styles.choice, boxed && styles.choiceBoxed, checked && boxed && styles.choiceOn, checked && boxed && pink && styles.pinkChoiceOn, hovered && !checked && boxed && { borderColor: colors.primaryLine, backgroundColor: colors.primarySoft }, disabled && { opacity: 0.5 }, style]}>
      <View style={[styles.check, checked && styles.checkOn, checked && pink && styles.pinkCheckOn]}>{checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
      {icon ? <Ionicons name={icon} size={18} color={pink ? colors.primaryText : colors.primary} style={{ marginRight: 2 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {description ? <Text style={styles.choiceDesc}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Onboarding chip (radius/pill), selected = soft rose with a check. */
export function Chip({ label, selected, onPress, icon, size = 'md', onRemove, pink = false }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; size?: 'sm' | 'md'; onRemove?: () => void; pink?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress && !onRemove} accessibilityRole={onPress ? 'checkbox' : undefined} accessibilityState={onPress ? { checked: !!selected } : undefined}
      style={({ hovered }: any) => [styles.chip, size === 'sm' && styles.chipSm, selected && styles.chipOn, selected && pink && styles.pinkChipOn, hovered && onPress && !selected && { borderColor: colors.primaryLine, backgroundColor: colors.primarySoft }]}>
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 13 : 15} color={selected ? (pink ? colors.primaryText : colors.primary) : colors.muted} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, size === 'sm' && { fontSize: 12 }, selected && { color: pink ? colors.primaryText : colors.primary, fontFamily: fonts.semibold }]}>{label}</Text>
      {selected && onPress ? <Ionicons name="checkmark" size={14} color={pink ? colors.primaryText : colors.primary} style={{ marginLeft: 6 }} /> : null}
      {onRemove ? <Pressable onPress={onRemove} accessibilityLabel={`Remove ${label}`} hitSlop={8}><Ionicons name="close" size={14} color={colors.primary} style={{ marginLeft: 6 }} /></Pressable> : null}
    </Pressable>
  );
}

export function ChipGroup({ options, value, onChange, max, style }: { options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; style?: any }) {
  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((x) => x !== o));
    else if (!max || value.length < max) onChange([...value, o]);
  };
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{options.map((o) => <Chip key={o} label={o} selected={value.includes(o)} onPress={() => toggle(o)} />)}</View>;
}

/** Read-only tag (interests, values). */
export function Tag({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'slate' }) {
  return (
    <View style={[styles.tag, tone === 'slate' && { backgroundColor: colors.bgTint }]}>
      <Text style={[styles.tagText, tone === 'slate' && { color: colors.textSoft }]}>{label}</Text>
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: '#D5DCE6', true: colors.primary }}
      thumbColor="#FFFFFF"
      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as any) : {})}
    />
  );
}

export function ToggleRow({ title, description, value, onChange, icon, tint = 'blue', disabled, last }: { title: string; description?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName; tint?: keyof typeof colors.tint; disabled?: boolean; last?: boolean }) {
  const t = colors.tint[tint];
  return (
    <View style={[styles.toggleRow, !last && styles.rowBorder]}>
      {icon ? <View style={[styles.rowIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={18} color={t.fg} /></View> : null}
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Toggle value={value} onChange={onChange} label={title} disabled={disabled} />
    </View>
  );
}

/** Selectable card with icon (onboarding "Communication style", lifestyle tiles). */
export function OptionTile({ label, sub, icon, selected, onPress, tint = 'blue', compact, pink = false }: { label: string; sub?: string; icon?: IconName; selected: boolean; onPress: () => void; tint?: keyof typeof colors.tint; compact?: boolean; pink?: boolean }) {
  const t = pink ? { fg: colors.primaryText, bg: colors.primarySoft } : colors.tint[tint];
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ hovered }: any) => [styles.tile, compact && styles.tileCompact, selected && styles.tileOn, selected && pink && styles.pinkTileOn, hovered && !selected && styles.tileHover]}>
      {({ hovered }: any) => (
        <>
          {selected ? <View style={[styles.tileCheck, pink && styles.pinkTileCheck]}><Ionicons name="checkmark" size={11} color="#fff" /></View> : null}
          {icon ? <View style={[styles.tileIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={compact ? 18 : 22} color={t.fg} /></View> : null}
          <Text style={[styles.tileLabel, selected && { color: pink ? colors.primaryText : colors.primary }, hovered && !selected && { color: colors.primaryText }]} numberOfLines={2}>{label}</Text>
          {sub ? <Text style={styles.tileSub} numberOfLines={2}>{sub}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

/** 1-5 rating circles (Reflect "Scale" questions). */
export function Scale({ value, onChange, min = 1, max = 5, minLabel, maxLabel }: { value: number | null; onChange: (v: number) => void; min?: number; max?: number; minLabel?: string; maxLabel?: string }) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {nums.map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="radio" accessibilityState={{ checked: value === n }} accessibilityLabel={`${n}${n === min && minLabel ? `, ${minLabel}` : ''}${n === max && maxLabel ? `, ${maxLabel}` : ''}`}
            style={[styles.scale, value === n && styles.scaleOn]}>
            <Text style={[styles.scaleText, value === n && { color: '#fff' }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={styles.helper}>{minLabel}</Text>
        <Text style={styles.helper}>{maxLabel}</Text>
      </View>
    </View>
  );
}

export const formStyles = StyleSheet.create({
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
});

const styles = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginBottom: 8 },
  optional: { fontFamily: fonts.regular, color: colors.faint },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surface, paddingHorizontal: 14 },
  boxMulti: { alignItems: 'flex-start', minHeight: 110 },
  boxFocus: { borderColor: colors.primary, borderWidth: 1.5 },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 12 },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  helper: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, flex: 1 },
  cc: { height: '100%' as any, paddingHorizontal: 14, justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.bg, borderTopLeftRadius: radius.input, borderBottomLeftRadius: radius.input, minHeight: 46 },
  ccText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  otpBox: { width: 46, height: 54, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  otpFilled: { borderColor: colors.primary, borderWidth: 1.5 },
  otpText: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  hiddenInput: { position: 'absolute', opacity: 0.01, width: '100%' as any, height: '100%' as any, color: 'transparent' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 48 },
  choiceBoxed: { paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, backgroundColor: colors.surface, marginBottom: 10 },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pinkChoiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  choiceLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  choiceDesc: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 18 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  pinkRadioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  pinkRadioDot: { backgroundColor: colors.primary },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pinkCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 38 },
  chipSm: { minHeight: 30, paddingHorizontal: 10 },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pinkChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSoft },
  tag: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, minHeight: 56 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  rowDesc: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 18 },
  tile: { flex: 1, minWidth: 96, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, backgroundColor: colors.surface, padding: 12, alignItems: 'center', gap: 8, minHeight: 96, justifyContent: 'center' },
  tileCompact: { minHeight: 76, padding: 10 },
  tileOn: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  tileHover: { borderColor: colors.primaryLine, backgroundColor: colors.primarySoft },
  pinkTileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tileCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pinkTileCheck: { backgroundColor: colors.primary },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, textAlign: 'center' },
  tileSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: 'center' },
  scale: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  scaleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSoft },
});
