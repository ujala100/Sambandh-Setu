import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { CheckRow, Chip, FieldLabel, Icon, OptionTile, RadioRow, SelectField, TextField } from '../ui';
import type { FieldDef, Opt, StepDef } from '../content/forms';

const norm = (o: Opt) => (typeof o === 'string' ? { value: o, label: o, icon: undefined as string | undefined, sub: undefined as string | undefined } : { label: o.value, ...o });

type Values = Record<string, any>;

export function SchemaFields({ step, values, onChange }: { step: StepDef; values: Values; onChange: (key: string, v: any) => void }) {
  return (
    <View>
      {step.fields.map((f) => <FieldBlock key={f.key} f={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} values={values} setOther={onChange} />)}
    </View>
  );
}

function Heading({ f, onSelectAll }: { f: FieldDef; onSelectAll?: () => void }) {
  if (!f.label) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{f.label}{f.optional ? <Text style={styles.optional}> (Optional)</Text> : null}</Text>
        {f.hint ? <Text style={styles.hint}>{f.hint}</Text> : null}
      </View>
      {onSelectAll ? <Pressable onPress={onSelectAll} hitSlop={8}><Text style={styles.selectAll}>Select all</Text></Pressable> : null}
    </View>
  );
}

function FieldBlock({ f, value, onChange, values, setOther }: { f: FieldDef; value: any; onChange: (v: any) => void; values: Values; setOther: (k: string, v: any) => void }) {
  const { wide, width } = useLayout();
  const list: string[] = Array.isArray(value) ? value : value ? [value] : [];
  const toggle = (v: string) => {
    if (f.single) return onChange(v);
    if (list.includes(v)) onChange(list.filter((x) => x !== v));
    else if (!f.max || list.length < f.max) onChange([...list, v]);
  };
  const cols = wide ? 5 : width >= 420 ? 4 : 3;
  const tileW = `${Math.floor(100 / cols) - 2}%`;

  switch (f.kind) {
    case 'tiles': {
      const groups = f.groups || [{ title: '', options: f.options || [] }];
      return (
        <View style={styles.block}>
          <Heading f={f} />
          {groups.map((g) => (
            <View key={g.title || 'all'} style={{ marginBottom: g.title ? space.lg : 0 }}>
              {g.title ? (
                <View style={styles.groupHead}>
                  <Text style={styles.groupTitle}>{g.title}</Text>
                  {!f.single ? <Pressable onPress={() => onChange(Array.from(new Set([...list, ...g.options.map((x) => norm(x).value)])))} hitSlop={8}><Text style={styles.selectAll}>Select all</Text></Pressable> : null}
                </View>
              ) : null}
              <View style={styles.grid}>
                {g.options.map((raw) => {
                  const op = norm(raw);
                  return (
                    <View key={op.value} style={{ width: tileW as any }}>
                      <OptionTile label={op.label} sub={op.sub} icon={(op.icon as any) || undefined} compact={f.compact} selected={list.includes(op.value)} onPress={() => toggle(op.value)} />
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'chips':
      return (
        <View style={styles.block}>
          <Heading f={f} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(f.options || []).map((raw) => { const op = norm(raw); return <Chip key={op.value} label={op.label} selected={list.includes(op.value)} onPress={() => toggle(op.value)} />; })}
          </View>
        </View>
      );
    case 'checklist':
      return (
        <View style={styles.block}>
          <Heading f={f} />
          <View style={styles.listCard}>
            {(f.options || []).map((raw, i, arr) => {
              const op = norm(raw);
              return <CheckRow key={op.value} label={op.label} boxed={false} checked={list.includes(op.value)} onPress={() => toggle(op.value)} style={[{ paddingHorizontal: 14 }, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} />;
            })}
          </View>
        </View>
      );
    case 'radio':
      return (
        <View style={styles.block}>
          <Heading f={f} />
          {(f.options || []).map((raw) => { const op = norm(raw); return <RadioRow key={op.value} label={op.label} selected={value === op.value} onPress={() => onChange(op.value)} />; })}
        </View>
      );
    case 'select':
      return <SelectField label={f.label} value={value || ''} options={(f.options || []).map((x) => norm(x).value)} onChange={onChange} />;
    case 'range': {
      const opts = f.options || [];
      const lo = values[`${f.key}Min`] ? String(values[`${f.key}Min`]) : '';
      const hi = values[`${f.key}Max`] ? String(values[`${f.key}Max`]) : '';
      return (
        <View style={styles.block}>
          <Heading f={f} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><SelectField label="From" value={lo} options={opts.map((x) => norm(x).value)} onChange={(v) => setOther(`${f.key}Min`, Number(v))} /></View>
            <View style={{ flex: 1 }}><SelectField label="To" value={hi} options={opts.map((x) => norm(x).value)} onChange={(v) => setOther(`${f.key}Max`, Number(v))} /></View>
          </View>
        </View>
      );
    }
    case 'tags':
      return <TagsField f={f} value={list} onChange={onChange} />;
    case 'text':
    default:
      return <TextField label={f.label} optional={f.optional} value={value || ''} onChangeText={onChange} placeholder={f.placeholder} multiline counter={f.maxLength || 300} maxLength={f.maxLength || 300} />;
  }
}

function TagsField({ f, value, onChange }: { f: FieldDef; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim();
    if (t && !value.includes(t) && value.length < 15) onChange([...value, t.slice(0, 40)]);
    setText('');
  };
  return (
    <View style={styles.block}>
      <Heading f={f} />
      <View style={styles.tagBox}>
        <Icon name="search" size={16} color={colors.faint} />
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} placeholder={f.placeholder} placeholderTextColor={colors.faint} style={styles.tagInput} accessibilityLabel={f.label} returnKeyType="done" />
        <Pressable onPress={add} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add"><Text style={styles.addText}>Add</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {value.map((v) => <Chip key={v} label={v} size="sm" selected onRemove={() => onChange(value.filter((x) => x !== v))} />)}
      </View>
    </View>
  );
}

/** One-line summary of a section's values ("Vegetarian · South Indian, Andhra · Cafés"). */
export function summarise(values: Values | undefined, max = 4) {
  if (!values) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (k === 'notes' || k === 'restrictionNote' || k === 'other') continue;
    if (Array.isArray(v) && v.length) parts.push(v.slice(0, 3).join(', '));
    else if (typeof v === 'string' && v) parts.push(v);
    else if (typeof v === 'number' && k.endsWith('Min') && values[k.replace('Min', 'Max')]) parts.push(`${v} - ${values[k.replace('Min', 'Max')]}`);
    if (parts.length >= max) break;
  }
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  block: { marginBottom: space.xl },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  optional: { fontFamily: fonts.regular, fontSize: 13, color: colors.faint },
  hint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  selectAll: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  groupTitle: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: 0.6, color: colors.textSoft, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  listCard: { backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tagBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: '#fff', paddingLeft: 12, paddingRight: 6, minHeight: 48 },
  tagInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, color: colors.text, paddingVertical: 10, outlineStyle: 'none' as any },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  addText: { fontFamily: fonts.semibold, fontSize: 13, color: '#fff' },
});

export { FieldLabel };
