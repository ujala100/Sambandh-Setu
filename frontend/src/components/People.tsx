import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Person, People as PeopleApi, Safety, assetUrl, errorMessage } from '../api';
import { colors, fonts, radius, shadow, space } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { Avatar, Button, ConfirmDialog, IconButton, IconName, Sheet, Tag, useToast } from '../ui';
import { nameAge } from '../utils/format';

export function VerifiedTick({ size = 16 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color={colors.primary} accessibilityLabel="Verified" />;
}

export function Meta({ icon, text }: { icon: IconName; text?: string }) {
  if (!text) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <Text style={styles.meta} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Why the recommender suggested this person ("You both value Honesty"). Never a score. */
export function Reasons({ reasons, compact }: { reasons?: string[]; compact?: boolean }) {
  if (!reasons || !reasons.length) return null;
  if (compact) {
    return (
      <View style={styles.reasonLine} accessibilityLabel={`Why suggested: ${reasons.join('. ')}`}>
        <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
        <Text style={styles.reasonText} numberOfLines={1}>{reasons.slice(0, 2).join(' · ')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.reasonBox} accessibilityLabel={`Why suggested: ${reasons.join('. ')}`}>
      <Text style={styles.reasonHead}>SHARED ALIGNMENT</Text>
      {reasons.slice(0, 3).map((r) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
          <Text style={styles.reasonText}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

/** Large Discover card (App "connection main - discover"). */
export function DiscoverCard({ p, onView, onInterest, onBookmark, sent }: { p: Person; onView: () => void; onInterest: () => void; onBookmark: () => void; sent?: boolean }) {
  return (
    <View style={styles.big}>
      <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel={`View ${p.name}'s profile`}>
        {p.photoUrl ? <Image source={{ uri: assetUrl(p.photoUrl) }} style={styles.bigPhoto} resizeMode="cover" accessibilityLabel={`${p.name}'s photo`} /> : (
          <View style={[styles.bigPhoto, styles.noPhoto]}><Text style={styles.initial}>{p.name.slice(0, 1)}</Text><Text style={styles.noPhotoText}>No photo shared yet</Text></View>
        )}
      </Pressable>
      <IconButton icon={p.bookmarked ? 'bookmark' : 'bookmark-outline'} label={p.bookmarked ? 'Remove bookmark' : 'Bookmark'} color={colors.primary} bg="#fff" size={36} onPress={onBookmark} style={styles.bookmark} />
      <View style={{ padding: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.bigName}>{nameAge(p)}</Text>
          {p.verified ? <VerifiedTick /> : null}
          {p.online ? <View style={styles.onlineDot} accessibilityLabel="Online" /> : null}
        </View>
        <Text style={styles.sub}>{[p.profession, p.location?.split(',')[0]].filter(Boolean).join(' · ')}</Text>
        <Meta icon="school-outline" text={p.education} />
        <Meta icon="location-outline" text={p.location} />
        {p.bio ? <Text style={styles.quote} numberOfLines={3}>“{p.bio}”</Text> : null}
        {p.interests.length ? <View style={styles.tags}>{p.interests.slice(0, 4).map((t) => <Tag key={t} label={t} />)}</View> : null}
        <Reasons reasons={p.reasons} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: space.md }}>
          <View style={{ flex: 1 }}><Button title="View Profile" variant="outline" size="sm" onPress={onView} /></View>
          <View style={{ flex: 1 }}><Button title={sent ? 'Interest Sent' : 'Express Interest'} icon={sent ? 'checkmark' : 'heart'} size="sm" onPress={onInterest} disabled={sent} /></View>
        </View>
      </View>
    </View>
  );
}

/** Compact Discover row (Web "Connections - Discover" list). */
export function DiscoverRow({ p, selected, onSelect, onView, onInterest, onBookmark, sent }: { p: Person; selected?: boolean; onSelect: () => void; onView: () => void; onInterest: () => void; onBookmark: () => void; sent?: boolean }) {
  return (
    <Pressable onPress={onSelect} accessibilityRole="button" accessibilityLabel={`${nameAge(p)}. Show details`} style={({ hovered }: any) => [styles.row, selected && styles.rowOn, hovered && !selected && { borderColor: colors.primaryLine }]}>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Avatar uri={p.photoUrl} name={p.name} size={64} rounded online={p.online} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.rowName}>{nameAge(p)}</Text>
            {p.verified ? <VerifiedTick size={15} /> : null}
          </View>
          <Meta icon="location-outline" text={p.location} />
          <Meta icon="briefcase-outline" text={p.profession} />
          {p.bio ? <Text style={styles.rowQuote} numberOfLines={1}>“{p.bio}”</Text> : null}
          {p.interests.length ? <View style={[styles.tags, { marginTop: 8 }]}>{p.interests.slice(0, 4).map((t) => <Tag key={t} label={t} />)}</View> : null}
          <Reasons reasons={p.reasons} compact />
        </View>
        <IconButton icon={p.bookmarked ? 'bookmark' : 'bookmark-outline'} label={p.bookmarked ? 'Remove bookmark' : 'Bookmark'} color={colors.primary} size={34} onPress={onBookmark} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}><Button title="View Profile" variant="outline" size="sm" onPress={onView} /></View>
        <View style={{ flex: 1 }}><Button title={sent ? 'Interest Sent' : 'Express Interest'} icon={sent ? 'checkmark' : 'heart'} size="sm" onPress={onInterest} disabled={sent} /></View>
      </View>
    </Pressable>
  );
}

export type MenuAction = { label: string; icon: IconName; onPress: () => void; danger?: boolean };

/** "⋮" menu as a bottom sheet / dialog. */
export function ActionMenu({ actions, label = 'More options', size = 36 }: { actions: MenuAction[]; label?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="ellipsis-vertical" label={label} size={size} color={colors.muted} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Options" maxWidth={380}>
        {actions.map((a) => (
          <Pressable key={a.label} onPress={() => { setOpen(false); setTimeout(a.onPress, 50); }} accessibilityRole="menuitem"
            style={({ hovered }: any) => [styles.menuItem, hovered && { backgroundColor: colors.bg }]}>
            <Ionicons name={a.icon} size={20} color={a.danger ? colors.dangerStrong : colors.textSoft} />
            <Text style={[styles.menuText, a.danger && { color: colors.dangerStrong }]}>{a.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

/** Block confirmation + call, shared by profile, chat and request menus. */
export function useBlock(onDone?: () => void) {
  const toast = useToast();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = (
    <ConfirmDialog visible={!!target} destructive icon="ban-outline" title={`Block ${target?.name}?`}
      message="You won't see each other anywhere on Sambandh Setu. Pending requests are withdrawn and an active connection is paused. You can unblock later from Settings."
      confirmLabel="Block" busy={busy} onCancel={() => setTarget(null)}
      onConfirm={async () => {
        if (!target) return;
        setBusy(true);
        try { await Safety.block(target.id); toast.show(`${target.name} has been blocked`); setTarget(null); onDone?.(); } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
      }} />
  );
  return { ask: (id: string, name: string) => setTarget({ id, name }), dialog };
}

export function useBookmark() {
  const toast = useToast();
  return async (p: Person, update: (on: boolean) => void) => {
    const on = !p.bookmarked;
    update(on);
    try { await PeopleApi.bookmark(p.id, on); toast.show(on ? 'Saved to bookmarks' : 'Removed from bookmarks', 'info'); } catch (e) { update(!on); toast.show(errorMessage(e), 'error'); }
  };
}

export function PersonLine({ p, right, onPress, subtitle, extra }: { p: Person; right?: React.ReactNode; onPress?: () => void; subtitle?: string; extra?: React.ReactNode }) {
  const { wide } = useLayout();
  return (
    <View style={styles.line}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${nameAge(p)}. View profile`} style={{ flexDirection: 'row', flex: 1, gap: 12, alignItems: 'center' }}>
        <Avatar uri={p.photoUrl} name={p.name} size={wide ? 58 : 52} rounded={wide} online={p.online} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.rowName}>{nameAge(p)}</Text>{p.verified ? <VerifiedTick size={15} /> : null}</View>
          <Meta icon="location-outline" text={p.location} />
          {subtitle ? <Meta icon="briefcase-outline" text={subtitle} /> : null}
          {extra}
        </View>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  big: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  bigPhoto: { width: '100%' as any, height: 260, backgroundColor: colors.primarySoft },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, fontSize: 64, color: colors.primary },
  noPhotoText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  bookmark: { position: 'absolute', top: 10, right: 10, ...shadow.card },
  bigName: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSoft, marginTop: 2 },
  quote: { fontFamily: fonts.regular, fontStyle: 'italic', fontSize: 13.5, lineHeight: 20, color: colors.textSoft, marginTop: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.online },
  row: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, ...shadow.card },
  rowOn: { borderColor: colors.primary, borderWidth: 1.5 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  rowQuote: { fontFamily: fonts.regular, fontStyle: 'italic', fontSize: 12.5, color: colors.textSoft, marginTop: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 8, borderRadius: radius.sm },
  menuText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  reasonBox: { marginTop: 12, backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 10, borderWidth: 1, borderColor: colors.border },
  reasonHead: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 0.8, color: colors.muted },
  reasonLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  reasonText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSoft, flexShrink: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.card },
});
