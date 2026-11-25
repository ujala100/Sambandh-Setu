import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { request, USE_MOCK } from '../../services/api';
import { store } from '../../services/mockData';
import { buildOwnProfile } from '../../services/myProfile';
import { PROFILES, Profile, Section } from '../../services/profileData';
import { getSectionValues, MATCH_PREFERENCES, SECTIONS, SectionDef, SectionValues } from '../../services/profileSections';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const TABS = ['About', 'Lifestyle', 'Family', 'Preferences'] as const;
type Tab = (typeof TABS)[number];

function findMatch(id?: string): Profile | null {
  if (!id) return null;
  if (PROFILES[id]) return PROFILES[id];
  const p = [...store.active, ...store.received, ...store.sent, ...store.discover].find((x) => x.id === id);
  if (!p) return null;
  return {
    name: p.name,
    age: p.age,
    gender: '',
    height: '',
    education: '',
    profession: p.profession,
    location: p.location,
    bio: '',
    about: [
      {
        title: 'Basics',
        rows: [
          { icon: 'location-outline', label: 'City', value: p.location },
          { icon: 'briefcase-outline', label: 'Profession', value: p.profession },
        ],
      },
    ],
    lifestyle: [],
    family: [],
  };
}

const Row = ({ icon, label, value, empty }: { icon: string; label: string; value?: string; empty: string }) => (
  <View style={styles.row}>
    <Ionicons name={icon as any} size={18} color={colors.primary} />
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, !value && styles.empty]}>{value || empty}</Text>
  </View>
);

export default function ProfileDetailScreen({ navigation, route }: any) {
  const params = route.params ?? {};
  const mode: 'own' | 'match' = params.mode ?? (params.personId ? 'match' : 'own');
  const editable = mode === 'own';

  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const [own, setOwn] = useState<Profile | null>(null);
  const [match, setMatch] = useState<Profile | null>(null);
  const [values, setValues] = useState<SectionValues>({});
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab) ? params.tab : 'About');

  useFocusEffect(
    useCallback(() => {
      if (!editable) return;
      (async () => {
        setOwn(await buildOwnProfile(user?.name ?? ''));
        setValues(await getSectionValues(userId));
      })();
    }, [editable, userId, user?.name])
  );

  useEffect(() => {
    if (editable) return;
    const targetId = params.personId ?? params.profileId;
    if (!targetId) return;

    if (!USE_MOCK) {
      request<{ profile: any }>(`/profiles/${targetId}`)
        .then((res) => {
          const raw = res?.profile || res;
          if (raw) {
            const u = raw.user || {};
            const name = raw.name || raw.displayName || u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Member';
            setMatch({
              name,
              age: raw.age || 0,
              gender: raw.gender && raw.gender !== 'Not specified' ? raw.gender : '',
              height: raw.heightCm ? `${raw.heightCm} cm` : '',
              education: raw.education || '',
              profession: raw.profession || '',
              location: raw.location || '',
              bio: raw.bio || '',
              about: [
                {
                  title: 'Personal Details',
                  rows: [
                    { icon: 'person-outline', label: 'Name', value: name },
                    { icon: 'location-outline', label: 'City', value: raw.location || '' },
                    { icon: 'language-outline', label: 'Languages', value: (raw.interests || []).join(', ') },
                  ],
                },
                {
                  title: 'Education & Career',
                  rows: [
                    { icon: 'school-outline', label: 'Education', value: raw.education || '' },
                    { icon: 'briefcase-outline', label: 'Profession', value: raw.profession || '' },
                  ],
                },
              ],
              lifestyle: [],
              family: [],
            });
          }
        })
        .catch(() => {
          const local = findMatch(targetId);
          if (local) setMatch(local);
        });
    } else {
      const local = findMatch(targetId);
      if (local) setMatch(local);
    }
  }, [editable, params.personId, params.profileId]);

  const profile: Profile | null = editable ? own : (match || findMatch(params.personId ?? params.profileId));

  if (editable && !own) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="My Profile" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="person-outline"
          title="Profile not found"
          description="This profile isn't available right now."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const emptyText = editable ? 'Not added yet' : 'Not shared';
  const editSection = (id: string) => navigation.navigate('EditSection', { sectionId: id });
  const photoUri = (profile as any).avatarUrl || (profile as any).photo || undefined;

  const renderSection = (s: Section, onEdit?: () => void) => (
    <Card key={s.title} style={{ marginBottom: spacing.md }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{s.title}</Text>
        {onEdit && (
          <Pressable onPress={onEdit} style={styles.pencil} accessibilityRole="button" accessibilityLabel={`Edit ${s.title}`}>
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>
      {s.rows.map((r) => <Row key={r.label} icon={r.icon} label={r.label} value={r.value} empty={emptyText} />)}
    </Card>
  );

  const renderDef = (d: SectionDef, vals: Record<string, string>) => (
    <Card key={d.id} style={{ marginBottom: spacing.md }}>
      <View style={styles.sectionHead}>
        <Ionicons name={d.icon as any} size={18} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { flex: 1 }]}>{d.title}</Text>
        {editable && (
          <Pressable onPress={() => editSection(d.id)} style={styles.pencil} accessibilityRole="button" accessibilityLabel={`Edit ${d.title}`}>
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>
      {d.fields.map((f) => <Row key={f.key} icon={f.icon} label={f.label} value={vals[f.key]} empty={emptyText} />)}
    </Card>
  );

  const defsFor = (t: SectionDef['tab']) => SECTIONS.filter((s) => s.tab === t);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={profile.age ? `${profile.name}, ${profile.age}` : profile.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Portrait Header */}
        <View style={[styles.heroCard, shadow.cardHover]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.heroPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback}>
              <View style={styles.monogramCircle}>
                <Text style={styles.monogramInitial}>
                  {profile.name?.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.heroOverlay}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{profile.name}{profile.age ? `, ${profile.age}` : ''}</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 6 }} />
            </View>
            {!!profile.profession && (
              <Text style={styles.heroSub}>
                <Ionicons name="briefcase" size={13} color="#fff" /> {profile.profession}
              </Text>
            )}
            {!!profile.location && (
              <Text style={styles.heroSub}>
                <Ionicons name="location-sharp" size={13} color="#fff" /> {profile.location}
              </Text>
            )}
          </View>
        </View>

        {/* Tab Pills */}
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabOn]}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        {tab === 'About' && (
          <View style={{ marginTop: spacing.md }}>
            {!!profile.bio && (
              <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.bioHead}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>About me</Text>
                </View>
                <Text style={styles.bioBody}>{profile.bio}</Text>
              </Card>
            )}
            {profile.about.map((s) => renderSection(s, editable ? () => navigation.navigate('EditProfile') : undefined))}
          </View>
        )}

        {tab === 'Lifestyle' && (
          <View style={{ marginTop: spacing.md }}>
            {editable
              ? defsFor('lifestyle').map((d) => renderDef(d, values[d.id] ?? {}))
              : profile.lifestyle.length > 0
              ? profile.lifestyle.map((s) => renderSection(s))
              : (
                <EmptyState
                  icon="document-text-outline"
                  title="Nothing shared yet"
                  description="They haven't filled out their lifestyle preferences yet."
                />
              )}
          </View>
        )}

        {tab === 'Family' && (
          <View style={{ marginTop: spacing.md }}>
            {editable
              ? defsFor('family').map((d) => renderDef(d, values[d.id] ?? {}))
              : profile.family.length > 0
              ? profile.family.map((s) => renderSection(s))
              : (
                <EmptyState
                  icon="people-outline"
                  title="Nothing shared yet"
                  description="Family background details have not been shared yet."
                />
              )}
          </View>
        )}

        {tab === 'Preferences' && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.prefSectionTitle}>
              {editable ? 'My Ideal Match Preferences' : `${profile.name.split(' ')[0]}'s Match Preferences`}
            </Text>
            {editable ? (
              <Card style={{ paddingVertical: 0, marginTop: spacing.md }}>
                {defsFor('preferences').map((d, i) => {
                  const filled = d.fields.filter((f) => values[d.id]?.[f.key]).length;
                  return (
                    <Pressable
                      key={d.id}
                      style={[styles.prefRow, i > 0 && styles.prefBorder]}
                      onPress={() => editSection(d.id)}
                      accessibilityRole="button"
                    >
                      <View style={styles.prefIcon}>
                        <Ionicons name={d.icon as any} size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                        <Text style={styles.prefTitle}>{d.title}</Text>
                        <Text style={styles.prefDesc}>
                          {filled > 0 ? `${filled} of ${d.fields.length} set` : d.desc}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </Pressable>
                  );
                })}
              </Card>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                {defsFor('preferences').map((d) => renderDef(d, MATCH_PREFERENCES[d.id] ?? {}))}
              </View>
            )}
            <Text style={styles.disclaimer}>
              Preferences help suggest the most compatible matches while honoring privacy.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg, // Mint Green: #C0E1CF
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 120,
  },

  heroCard: {
    width: '100%',
    height: 300,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  monogramCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  monogramInitial: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.primary,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(36, 59, 54, 0.72)',
    padding: spacing.md,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroName: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#fff',
  },
  heroSub: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#fff',
    marginTop: 2,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.text,
  },
  tabTextOn: {
    fontFamily: fonts.semibold,
    color: '#fff',
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  prefSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  pencil: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bioBody: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    marginLeft: spacing.sm,
    width: 110,
  },
  value: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.text,
    textAlign: 'right',
  },
  empty: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontStyle: 'italic',
  },

  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  prefBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  prefDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
