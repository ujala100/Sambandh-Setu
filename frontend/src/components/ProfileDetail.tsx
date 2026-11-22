import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonProfile, assetUrl } from '../api';
import { colors, fonts, radius, space } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { Card, EmptyState, InfoNote, KeyValue, Tag, UnderlineTabs } from '../ui';
import { LIFESTYLE, LIFESTYLE_ORDER } from '../content/forms';
import { INTENTS } from '../content/forms';
import { summarise } from './SchemaForm';
import { cmToFeet, formatDate, nameAge } from '../utils/format';
import { VerifiedTick } from './People';

export type ProfileTab = 'overview' | 'about' | 'lifestyle' | 'family';

/** Body of another member's profile (tabs from "view profile overview/about/lifestyle/family"). */
export function ProfileDetail({ p, tab: initial = 'overview', compact, headerRight }: { p: PersonProfile; tab?: ProfileTab; compact?: boolean; headerRight?: React.ReactNode }) {
  const [tab, setTab] = useState<ProfileTab>(initial);
  const pronoun = p.relation === 'connected' ? p.name : p.name;
  return (
    <View>
      <UnderlineTabs value={tab} onChange={setTab} options={[{ key: 'overview', label: 'Overview' }, { key: 'about', label: 'About' }, { key: 'lifestyle', label: 'Lifestyle' }, { key: 'family', label: 'Family' }]} style={{ marginBottom: space.lg }} />
      {tab === 'overview' ? <Overview p={p} compact={compact} headerRight={headerRight} /> : null}
      {tab === 'about' ? <About p={p} who={pronoun} /> : null}
      {tab === 'lifestyle' ? <Lifestyle p={p} /> : null}
      {tab === 'family' ? <FamilyTab p={p} /> : null}
    </View>
  );
}

function Fact({ icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}><Ionicons name={icon} size={16} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.factValue} numberOfLines={2}>{value || 'Not specified'}</Text>
        <Text style={styles.factLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Overview({ p, compact, headerRight }: { p: PersonProfile; compact?: boolean; headerRight?: React.ReactNode }) {
  const { wide } = useLayout();
  const intent = INTENTS.find((i) => i.value === p.intent);
  return (
    <View>
      {p.photoUrl ? <Image source={{ uri: assetUrl(p.photoUrl) }} style={[styles.photo, compact && { height: 240 }]} resizeMode="cover" accessibilityLabel={`${p.name}'s photo`} /> : (
        <View style={[styles.photo, styles.noPhoto, compact && { height: 180 }]}><Text style={styles.initial}>{p.name.slice(0, 1)}</Text><Text style={styles.muted}>{p.relation === 'connected' ? 'No photo shared yet' : 'Photo not shared'}</Text></View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name}>{nameAge(p)}</Text>
            {p.verified ? <VerifiedTick size={18} /> : null}
            {p.online ? <View style={styles.online}><Text style={styles.onlineText}>Online</Text></View> : null}
          </View>
          <Text style={styles.sub}>{[p.profession, p.location].filter(Boolean).join(' · ')}</Text>
        </View>
        {headerRight}
      </View>
      <View style={[styles.factRow, !wide && { flexWrap: 'wrap' }]}>
        <Fact icon="briefcase-outline" label="Profession" value={p.profession} />
        <Fact icon="school-outline" label="Education" value={p.education} />
        <Fact icon="location-outline" label="Location" value={p.location?.split(',')[0]} />
      </View>
      {p.values.length || p.interests.length ? <View style={styles.tags}>{[...p.values, ...p.interests].slice(0, 6).map((t) => <Tag key={t} label={t} />)}</View> : null}
      {p.bio ? <View style={styles.quote}><Text style={styles.quoteMark}>“</Text><Text style={styles.quoteText}>{p.bio}</Text></View> : null}
      <Card style={{ marginTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><Text style={styles.h}>At a glance</Text></View>
        <View style={styles.glance}>
          {[
            ['resize-outline', p.heightCm ? `${cmToFeet(p.heightCm)}` : '', 'Height'],
            ['heart-outline', p.maritalStatus, 'Marital Status'],
            ['flower-outline', p.religion ? [p.religion.religion, p.religion.caste].filter(Boolean).join(' · ') : '', 'Religion & Caste'],
            ['location-outline', p.location, 'Location'],
            ['airplane-outline', p.relocation, 'Relocation'],
            ['compass-outline', intent?.label || '', 'Looking for'],
          ].map(([icon, v, l]) => (
            <View key={l} style={styles.glanceItem}>
              <Ionicons name={icon as any} size={16} color={colors.muted} />
              <View style={{ flex: 1 }}><Text style={styles.glanceValue}>{v || 'Not specified'}</Text><Text style={styles.factLabel}>{l}</Text></View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

function About({ p, who }: { p: PersonProfile; who: string }) {
  const intent = INTENTS.find((i) => i.value === p.intent);
  const comm = p.communication || {};
  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <Text style={styles.h}>About {who}</Text>
        <Text style={[styles.body, { marginTop: 6 }]}>{p.bio || `${who} hasn't written an introduction yet.`}</Text>
      </Card>
      <Card>
        <Text style={[styles.h, { marginBottom: 6 }]}>Personal Details</Text>
        <KeyValue label="Age" value={p.age ? `${p.age} years` : ''} />
        <KeyValue label="Height" value={p.heightCm ? `${cmToFeet(p.heightCm)} (${p.heightCm} cm)` : ''} />
        <KeyValue label="Location" value={p.location} />
        <KeyValue label="Marital Status" value={p.maritalStatus} />
        <KeyValue label="Languages" value={p.languages.join(', ')} last />
      </Card>
      <Card>
        <Text style={[styles.h, { marginBottom: 6 }]}>Education & Career</Text>
        <KeyValue label="Education" value={p.education} />
        <KeyValue label="Profession" value={p.profession} last />
      </Card>
      <Card>
        <Text style={[styles.h, { marginBottom: 6 }]}>Values & Outlook</Text>
        <KeyValue label="Looking for" value={intent?.label} />
        <KeyValue label="Communicates through" value={(comm.channels || []).join(', ')} />
        <KeyValue label="Communication style" value={(comm.styles || []).join(', ')} last />
        {p.values.length ? <View style={styles.tags}>{p.values.map((v) => <Tag key={v} label={v} />)}</View> : null}
      </Card>
      <Text style={styles.muted}>Member since {formatDate(p.memberSince)}</Text>
    </View>
  );
}

function Lifestyle({ p }: { p: PersonProfile }) {
  const sections = LIFESTYLE_ORDER.filter((k) => p.lifestyle?.[k] && Object.keys(p.lifestyle[k]).length);
  if (!sections.length && !p.interests.length) return <EmptyState icon="leaf-outline" title="No lifestyle details yet" text={`${p.name} hasn't added lifestyle details yet.`} />;
  return (
    <View style={{ gap: space.lg }}>
      {p.interests.length ? <Card><Text style={[styles.h, { marginBottom: 10 }]}>Interests</Text><View style={styles.tags}>{p.interests.map((t) => <Tag key={t} label={t} />)}</View></Card> : null}
      {sections.length ? (
        <Card padded={false}>
          {sections.map((k, i) => {
            const def = LIFESTYLE[k];
            const t = colors.tint[def.tint as keyof typeof colors.tint];
            return (
              <View key={k} style={[styles.lsRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.factIcon, { backgroundColor: t.bg }]}><Ionicons name={def.icon as any} size={16} color={t.fg} /></View>
                <View style={{ flex: 1 }}><Text style={styles.lsTitle}>{def.title}</Text><Text style={styles.muted}>{summarise(p.lifestyle[k]) || 'Not specified'}</Text></View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </View>
  );
}

function FamilyTab({ p }: { p: PersonProfile }) {
  if (!p.familyShared || !p.family) {
    return <InfoNote icon="lock-closed" title="Family details are private" text={`${p.name} has chosen not to share family details yet. You can ask about family when you feel comfortable.`} />;
  }
  const f = p.family;
  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <Text style={[styles.h, { marginBottom: 6 }]}>Family Background</Text>
        <KeyValue label="Father" value={f.father} />
        <KeyValue label="Mother" value={f.mother} />
        <KeyValue label="Family Type" value={f.familyType} />
        <KeyValue label="Siblings" value={f.siblings} />
        <KeyValue label="Family Location" value={f.location} />
        <KeyValue label="Family Values" value={f.values} last />
      </Card>
      {f.note ? <InfoNote icon="home-outline" text={`“${f.note}”`} /> : null}
      {f.involvement ? (
        <Card>
          <Text style={[styles.h, { marginBottom: 6 }]}>Family Involvement Preference</Text>
          <KeyValue label="Preferred stage" value={f.involvement.preferredStage} />
          <KeyValue label="Family meeting" value={f.involvement.meeting} last />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%' as any, height: 340, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, fontSize: 72, color: colors.primary },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted, marginTop: 2 },
  online: { backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  onlineText: { fontFamily: fonts.semibold, fontSize: 11, color: '#0F9F6E' },
  factRow: { flexDirection: 'row', gap: 8, marginTop: space.lg },
  fact: { flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 10 },
  factIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  factValue: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text },
  factLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  quote: { flexDirection: 'row', gap: 6, backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 14, marginTop: space.lg },
  quoteMark: { fontFamily: fonts.bold, fontSize: 26, color: colors.primary, lineHeight: 28 },
  quoteText: { flex: 1, fontFamily: fonts.regular, fontStyle: 'italic', fontSize: 14, lineHeight: 21, color: colors.textSoft },
  h: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSoft },
  muted: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  glance: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  glanceItem: { width: '33.3%' as any, minWidth: 110, flexDirection: 'row', gap: 8, paddingRight: 8 },
  glanceValue: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text },
  lsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lsTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
