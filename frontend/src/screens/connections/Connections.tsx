import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConnectionItem, Connections as ConnApi, DiscoverQuery, People, Person, RequestItem, Requests, errorMessage } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Card, CheckRow, ConfirmDialog, EmptyState, ErrorState, IconButton, Loading, Screen, Segmented, SelectField, Sheet, SkeletonList, StageDots, StatePill, Txt, UnderlineTabs, useToast } from '../../ui';
import { ActionMenu, DiscoverCard, DiscoverRow, Meta, PersonLine, useBlock, useBookmark, VerifiedTick } from '../../components/People';
import { ProfileDetail } from '../../components/ProfileDetail';
import { usePersonActions } from './PersonProfile';
import { formatDate, nameAge, timeAgo } from '../../utils/format';

type Tab = 'discover' | 'requests' | 'active';

export default function Connections({ route, navigation }: any) {
  const tab: Tab = ['discover', 'requests', 'active'].includes(route.params?.tab) ? route.params.tab : 'discover';
  const setTab = (t: Tab) => navigation.setParams({ tab: t });
  const sub = { discover: 'Find people who share your values, goals and future hopes.', requests: 'Manage your interest requests.', active: 'Continue your journey with your connections.' }[tab];
  const { wide } = useLayout();
  const header = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Connections</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        {!wide ? <IconButton icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} /> : null}
      </View>
      <Segmented value={tab} onChange={setTab} options={[{ key: 'discover', label: 'Discover' }, { key: 'requests', label: 'Requests' }, { key: 'active', label: 'Active' }]} style={{ marginVertical: space.lg, maxWidth: wide ? 520 : undefined }} />
    </>
  );
  if (tab === 'discover') return <Discover header={header} navigation={navigation} q={route.params?.q} />;
  if (tab === 'requests') return <RequestsTab header={header} navigation={navigation} />;
  return <ActiveTab header={header} navigation={navigation} />;
}

// ---------------- Discover ----------------

function Discover({ header, navigation, q: initialQ }: { header: React.ReactNode; navigation: any; q?: string }) {
  const { wide } = useLayout();
  const toast = useToast();
  const [q, setQ] = useState(initialQ || '');
  const [query, setQuery] = useState<DiscoverQuery>({ q: initialQ, page: 1, sort: 'recommended' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const { data, setData, error, loading, reload, refreshing, refresh } = useLoad(() => People.discover(query), [JSON.stringify(query)]);
  const bookmark = useBookmark();
  useEffect(() => { if (initialQ !== undefined) { setQ(initialQ); setQuery((s) => ({ ...s, q: initialQ, page: 1 })); } }, [initialQ]);
  useEffect(() => { if (wide && data?.items.length && !data.items.find((p) => p.id === selected)) setSelected(data.items[0].id); }, [data, wide]);

  const updatePerson = (id: string, patch: Partial<Person>) => setData((d) => d && { ...d, items: d.items.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const interest = async (p: Person) => {
    setSent((s) => ({ ...s, [p.id]: true }));
    try { await Requests.send(p.id); toast.show(`Interest sent to ${p.name}`); } catch (e) { setSent((s) => ({ ...s, [p.id]: false })); toast.show(errorMessage(e), 'error'); }
  };
  const view = (p: Person) => navigation.navigate('PersonProfile', { userId: p.id });
  const activeFilters = ['ageMin', 'ageMax', 'location', 'education', 'profession', 'verifiedOnly'].filter((k) => (query as any)[k]).length;

  const searchBar = (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: space.lg }}>
      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.faint} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setQuery((s) => ({ ...s, q: q.trim(), page: 1 }))} placeholder="Search by name, location, profession..." placeholderTextColor={colors.faint} style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} accessibilityLabel="Search" returnKeyType="search" />
        {q ? <Pressable onPress={() => { setQ(''); setQuery((s) => ({ ...s, q: '', page: 1 })); }} accessibilityLabel="Clear search" hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
      </View>
      <Pressable onPress={() => setFiltersOpen(true)} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel={`Filters${activeFilters ? `, ${activeFilters} active` : ''}`}>
        <Ionicons name="options-outline" size={18} color={colors.text} />
        {wide ? <Text style={styles.filterText}>Filters</Text> : null}
        {activeFilters ? <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilters}</Text></View> : null}
      </Pressable>
      {wide ? (
        <View style={{ width: 170 }}>
          <SelectField value={query.sort || 'recommended'} options={[{ value: 'recommended', label: 'Sort: Recommended' }, { value: 'newest', label: 'Sort: Newest' }, { value: 'active', label: 'Sort: Recently active' }]} onChange={(v) => setQuery((s) => ({ ...s, sort: v, page: 1 }))} />
        </View>
      ) : null}
    </View>
  );

  const list = loading && !data ? <SkeletonList rows={3} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? (
    <Card><EmptyState icon="compass-outline" tint="blue" title={query.q || activeFilters ? 'No profiles match your search' : 'No new profiles right now'} text={query.q || activeFilters ? 'Try a different search or fewer filters.' : 'New members join every day. Check back soon, or widen your partner preferences.'} action={query.q || activeFilters ? 'Clear search & filters' : 'Edit preferences'} onAction={() => (query.q || activeFilters ? (setQ(''), setQuery({ page: 1, sort: query.sort })) : navigation.navigate('PreferencesReview'))} /></Card>
  ) : (
    <View style={{ gap: space.lg }}>
      {!wide && data.newProfiles.length ? (
        <View>
          <Text style={styles.h}>Recommended for you</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 10 }}>
            {data.items.slice(0, 8).map((p) => (
              <Pressable key={p.id} onPress={() => view(p)} style={{ alignItems: 'center', width: 64 }} accessibilityRole="button" accessibilityLabel={`${nameAge(p)}. View profile`}>
                <Avatar uri={p.photoUrl} name={p.name} size={56} online={p.online} />
                <Text style={styles.miniName} numberOfLines={1}>{p.name}</Text>
                {p.age ? <Text style={styles.miniAge}>{p.age}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : wide ? <View><Text style={styles.h}>Recommended for you</Text><Text style={styles.sub}>Profiles based on your preferences and interests.</Text></View> : null}
      {data.items.map((p) => wide ? (
        <DiscoverRow key={p.id} p={p} selected={selected === p.id} sent={sent[p.id]} onSelect={() => setSelected(p.id)} onView={() => view(p)} onInterest={() => interest(p)} onBookmark={() => bookmark(p, (on) => updatePerson(p.id, { bookmarked: on }))} />
      ) : (
        <DiscoverCard key={p.id} p={p} sent={sent[p.id]} onView={() => view(p)} onInterest={() => interest(p)} onBookmark={() => bookmark(p, (on) => updatePerson(p.id, { bookmarked: on }))} />
      ))}
      {data.totalPages > 1 ? (
        <View style={styles.pager}>
          <IconButton icon="chevron-back" label="Previous page" size={36} onPress={() => setQuery((s) => ({ ...s, page: Math.max(1, (s.page || 1) - 1) }))} />
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => i + 1).map((n) => (
            <Pressable key={n} onPress={() => setQuery((s) => ({ ...s, page: n }))} style={[styles.page, data.page === n && styles.pageOn]} accessibilityRole="button" accessibilityLabel={`Page ${n}`}><Text style={[styles.pageText, data.page === n && { color: '#fff' }]}>{n}</Text></Pressable>
          ))}
          <IconButton icon="chevron-forward" label="Next page" size={36} onPress={() => setQuery((s) => ({ ...s, page: Math.min(data.totalPages, (s.page || 1) + 1) }))} />
        </View>
      ) : null}
      {!wide && data.newProfiles.length ? (
        <View>
          <Text style={styles.h}>New Profiles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 10 }}>
            {data.newProfiles.map((p) => (
              <Pressable key={p.id} onPress={() => view(p)} style={{ alignItems: 'center', width: 64 }} accessibilityRole="button" accessibilityLabel={`${nameAge(p)}. View profile`}>
                <Avatar uri={p.photoUrl} name={p.name} size={56} online={p.online} />
                <Text style={styles.miniName} numberOfLines={1}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen variant="none" tab refreshing={refreshing} onRefresh={refresh} maxWidth={wide ? 560 : undefined} asideWidth={440}
      aside={wide && selected ? <PreviewPanel userId={selected} navigation={navigation} onChanged={reload} /> : undefined}>
      {header}
      {searchBar}
      {list}
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} query={query} onApply={(f) => { setQuery((s) => ({ ...s, ...f, page: 1 })); setFiltersOpen(false); }} />
    </Screen>
  );
}

function PreviewPanel({ userId, navigation, onChanged }: { userId: string; navigation: any; onChanged: () => void }) {
  const { data, error, loading, reload } = useLoad(() => People.get(userId), [userId], { onFocus: false });
  const { bar, menu, dialog } = usePersonActions(data, () => { reload(); onChanged(); }, navigation);
  return (
    <View>
      <Card>
        {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} /> : data ? (
          <>
            <ProfileDetail p={data} compact headerRight={menu} />
            <View style={{ marginTop: space.lg }}>{bar}</View>
          </>
        ) : null}
      </Card>
      {dialog}
    </View>
  );
}

function FiltersSheet({ open, onClose, query, onApply }: { open: boolean; onClose: () => void; query: DiscoverQuery; onApply: (f: Partial<DiscoverQuery>) => void }) {
  const [f, setF] = useState<Partial<DiscoverQuery>>(query);
  useEffect(() => { if (open) setF(query); }, [open]);
  const ages = Array.from({ length: 43 }, (_, i) => String(18 + i));
  return (
    <Sheet visible={open} onClose={onClose} title="Filters" maxWidth={480}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><SelectField label="Age from" value={f.ageMin ? String(f.ageMin) : ''} options={ages} onChange={(v) => setF((s) => ({ ...s, ageMin: Number(v) }))} placeholder="Any" /></View>
        <View style={{ flex: 1 }}><SelectField label="Age to" value={f.ageMax ? String(f.ageMax) : ''} options={ages} onChange={(v) => setF((s) => ({ ...s, ageMax: Number(v) }))} placeholder="Any" /></View>
      </View>
      <SelectField label="Location" value={f.location || ''} options={['', 'Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Pune', 'Delhi', 'Kolkata', 'Ahmedabad', 'Kochi'].map((x) => ({ value: x, label: x || 'Any' }))} onChange={(v) => setF((s) => ({ ...s, location: v }))} placeholder="Any" />
      <SelectField label="Education" value={f.education || ''} options={['', 'B.Tech', "Bachelor", "Master", 'MBA', 'MBBS', 'PhD'].map((x) => ({ value: x, label: x || 'Any' }))} onChange={(v) => setF((s) => ({ ...s, education: v }))} placeholder="Any" />
      <CheckRow label="Verified members only" checked={!!f.verifiedOnly} onPress={() => setF((s) => ({ ...s, verifiedOnly: !s.verifiedOnly }))} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <View style={{ flex: 1 }}><Button title="Clear" variant="ghost" onPress={() => onApply({ ageMin: undefined, ageMax: undefined, location: '', education: '', profession: '', verifiedOnly: false })} /></View>
        <View style={{ flex: 1 }}><Button title="Apply" onPress={() => onApply(f)} /></View>
      </View>
    </Sheet>
  );
}

// ---------------- Requests ----------------

function RequestsTab({ header, navigation }: { header: React.ReactNode; navigation: any }) {
  const { wide } = useLayout();
  const toast = useToast();
  const [sub, setSub] = useState<'received' | 'sent'>('received');
  const [selected, setSelected] = useState<string | null>(null);
  const { data, setData, error, loading, reload, refreshing, refresh } = useLoad(() => Requests.list());
  const block = useBlock(reload);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (r: RequestItem, kind: 'accept' | 'decline' | 'withdraw') => {
    setBusy(r.id + kind);
    try {
      if (kind === 'accept') {
        const res = await Requests.accept(r.id);
        toast.show(`You and ${r.person.name} are now connected`);
        navigation.navigate('Journey', { connectionId: res.connectionId });
      } else if (kind === 'decline') { await Requests.decline(r.id); toast.show('Request declined', 'info'); }
      else { await Requests.withdraw(r.id); toast.show('Interest withdrawn', 'info'); }
      setData((d) => d && { received: d.received.filter((x) => x.id !== r.id), sent: d.sent.filter((x) => x.id !== r.id) });
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };

  const items = data ? data[sub] : [];
  const sel = items.find((r) => r.id === selected) || (wide ? items[0] : undefined);

  return (
    <Screen variant="none" tab refreshing={refreshing} onRefresh={refresh} maxWidth={wide ? 720 : undefined} asideWidth={380}
      aside={wide && sel ? <RequestDetail r={sel} sub={sub} navigation={navigation} onAct={act} busy={busy} /> : undefined}>
      {header}
      {loading && !data ? <SkeletonList rows={4} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <>
          <UnderlineTabs value={sub} onChange={setSub} options={[{ key: 'received', label: `Received (${data.received.length})` }, { key: 'sent', label: `Sent (${data.sent.length})` }]} style={{ marginBottom: space.lg }} />
          <Text style={styles.h}>{sub === 'received' ? 'Received Requests' : 'Sent Requests'}</Text>
          <Text style={[styles.sub, { marginBottom: space.md }]}>{sub === 'received' ? 'People who are interested in you.' : 'People you have shown interest in.'}</Text>
          {!items.length ? (
            <Card><EmptyState icon={sub === 'received' ? 'heart-outline' : 'paper-plane-outline'} tint="pink" title={sub === 'received' ? 'No requests yet' : 'No pending requests'} text={sub === 'received' ? 'When someone expresses interest in you, it will appear here.' : 'Interest you send appears here until the other person responds.'} action="Explore Discover" onAction={() => navigation.setParams({ tab: 'discover' })} /></Card>
          ) : (
            <View style={{ gap: 12 }}>
              {items.map((r) => (
                <Pressable key={r.id} onPress={() => (wide ? setSelected(r.id) : navigation.navigate('PersonProfile', { userId: r.person.id }))} accessibilityRole="button" accessibilityLabel={`${nameAge(r.person)}. ${sub === 'received' ? 'Interested in you' : 'Waiting for response'}`}
                  style={[styles.reqCard, wide && sel?.id === r.id && { borderColor: colors.primary }]}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Avatar uri={r.person.photoUrl} name={r.person.name} size={56} online={r.person.online} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.name}>{nameAge(r.person)}</Text>{r.person.verified ? <VerifiedTick size={15} /> : null}</View>
                      <Meta icon="location-outline" text={r.person.location} />
                      <Meta icon="briefcase-outline" text={r.person.profession} />
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatePill state={sub === 'received' ? 'interest_received' : 'waiting'} />
                      <Text style={styles.time}>{timeAgo(r.createdAt)}</Text>
                    </View>
                    <ActionMenu actions={[
                      { label: 'View profile', icon: 'person-outline', onPress: () => navigation.navigate('PersonProfile', { userId: r.person.id }) },
                      { label: 'Report', icon: 'flag-outline', onPress: () => navigation.navigate('ReportFlow', { userId: r.person.id, name: r.person.name }) },
                      { label: 'Block', icon: 'ban-outline', danger: true, onPress: () => block.ask(r.person.id, r.person.name) },
                    ]} />
                  </View>
                  {r.message ? <Text style={styles.msg}>“{r.message}”</Text> : null}
                  {!wide ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      {sub === 'received' ? (
                        <>
                          <View style={{ flex: 1 }}><Button title="Decline" variant="ghost" size="sm" onPress={() => act(r, 'decline')} loading={busy === r.id + 'decline'} /></View>
                          <View style={{ flex: 1 }}><Button title="Accept" size="sm" onPress={() => act(r, 'accept')} loading={busy === r.id + 'accept'} /></View>
                        </>
                      ) : <Button title="Withdraw" variant="outline" size="sm" full={false} onPress={() => act(r, 'withdraw')} loading={busy === r.id + 'withdraw'} style={{ marginLeft: 'auto' }} />}
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
      {block.dialog}
    </Screen>
  );
}

function RequestDetail({ r, sub, navigation, onAct, busy }: { r: RequestItem; sub: 'received' | 'sent'; navigation: any; onAct: (r: RequestItem, k: any) => void; busy: string | null }) {
  const p = r.person;
  return (
    <Card>
      <Txt variant="section">Request details</Txt>
      <Txt variant="caption" style={{ marginBottom: space.md }}>View profile and respond to this request.</Txt>
      <View style={{ alignItems: 'center', marginBottom: space.md }}><Avatar uri={p.photoUrl} name={p.name} size={120} rounded /></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.name}>{nameAge(p)}</Text>{p.verified ? <VerifiedTick /> : null}{p.online ? <StatePill state="online" /> : null}</View>
      <Meta icon="location-outline" text={p.location} />
      <Meta icon="briefcase-outline" text={p.profession} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}><StatePill state={sub === 'received' ? 'interest_received' : 'waiting'} /><Text style={styles.time}>{timeAgo(r.createdAt)}</Text></View>
      {p.bio ? <View style={styles.quoteBox}><Text style={styles.msg}>“{p.bio}”</Text></View> : null}
      {p.interests.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>{p.interests.slice(0, 5).map((t) => <StatePill key={t} state="x" label={t} />)}</View> : null}
      <Button title="View full profile" variant="text" size="sm" onPress={() => navigation.navigate('PersonProfile', { userId: p.id })} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {sub === 'received' ? (
          <>
            <View style={{ flex: 1 }}><Button title="Decline" variant="ghost" size="sm" onPress={() => onAct(r, 'decline')} loading={busy === r.id + 'decline'} /></View>
            <View style={{ flex: 1 }}><Button title="Accept" size="sm" onPress={() => onAct(r, 'accept')} loading={busy === r.id + 'accept'} /></View>
          </>
        ) : <View style={{ flex: 1 }}><Button title="Withdraw" variant="outline" size="sm" onPress={() => onAct(r, 'withdraw')} loading={busy === r.id + 'withdraw'} /></View>}
      </View>
    </Card>
  );
}

// ---------------- Active ----------------

const STAGE_COLOR: Record<string, string> = { connect: colors.primary, understand: colors.primary, reflect: '#E08A1E', discuss: '#D9467A', agree: '#7C5CDB', family: '#0F9F6E', reflect_again: '#E08A1E', decision: colors.navy };

function ActiveTab({ header, navigation }: { header: React.ReactNode; navigation: any }) {
  const { wide } = useLayout();
  const toast = useToast();
  const { data, error, loading, reload, refreshing, refresh } = useLoad(() => ConnApi.list());
  const [showClosed, setShowClosed] = useState(false);
  const [confirm, setConfirm] = useState<{ c: ConnectionItem; kind: 'pause' | 'close' } | null>(null);
  const block = useBlock(reload);
  const act = async (c: ConnectionItem, kind: 'pause' | 'resume' | 'close') => {
    try {
      if (kind === 'pause') await ConnApi.pause(c.id);
      else if (kind === 'resume') await ConnApi.resume(c.id);
      else await ConnApi.close(c.id);
      toast.show(kind === 'pause' ? 'Connection paused' : kind === 'resume' ? 'Connection resumed' : 'Connection closed respectfully', 'info');
      setConfirm(null);
      reload();
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const menu = (c: ConnectionItem) => (
    <ActionMenu actions={[
      ...(c.chatId ? [{ label: 'Open chat', icon: 'chatbubble-ellipses-outline' as const, onPress: () => navigation.navigate('ChatThread', { chatId: c.chatId }) }] : []),
      { label: 'View profile', icon: 'person-outline', onPress: () => navigation.navigate('PersonProfile', { userId: c.person.id }) },
      ...(c.status === 'active' ? [{ label: 'Pause connection', icon: 'pause-circle-outline' as const, onPress: () => setConfirm({ c, kind: 'pause' }) }] : []),
      ...(c.status !== 'closed' ? [{ label: 'Close respectfully', icon: 'close-circle-outline' as const, onPress: () => setConfirm({ c, kind: 'close' }) }] : []),
      { label: 'Block', icon: 'ban-outline', danger: true, onPress: () => block.ask(c.person.id, c.person.name) },
    ]} />
  );
  const rail = wide ? (
    <>
      <Card>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ionicons name="trail-sign-outline" size={18} color={colors.primary} /><Txt variant="section">Your Journey</Txt></View>
        <Txt variant="caption" style={{ marginBottom: 12 }}>Build meaningful connections at your own pace.</Txt>
        {[['Connect', 'You have connected with someone'], ['Understand', 'Get to know each other better'], ['Reflect', 'Share values, background and expectations'], ['Discuss', "When you're both ready to take the next step"]].map(([t, d], i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Ionicons name={i === 0 ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={i === 0 ? colors.primary : colors.borderStrong} />
            <View style={{ flex: 1 }}><Text style={styles.railT}>{t}</Text><Text style={styles.time}>{d}</Text></View>
          </View>
        ))}
      </Card>
      <Card tone="tint"><View style={{ flexDirection: 'row', gap: 10 }}><Ionicons name="heart-outline" size={18} color={colors.dangerStrong} /><Text style={[styles.sub, { flex: 1, marginTop: 0 }]}>Take your time. Meaningful connections grow at your pace.</Text></View></Card>
    </>
  ) : undefined;

  return (
    <Screen variant="none" tab refreshing={refreshing} onRefresh={refresh} aside={rail} maxWidth={wide ? 820 : undefined}>
      {header}
      {loading && !data ? <SkeletonList rows={3} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <>
          <Text style={styles.h}>Active Connections</Text>
          <Text style={[styles.sub, { marginBottom: space.md }]}>People you are connected with and exploring.</Text>
          {!data.active.length ? <Card><EmptyState icon="people-outline" tint="blue" title="No active connections" text="When you accept a request, or someone accepts yours, your connection appears here." action="Explore Discover" onAction={() => navigation.setParams({ tab: 'discover' })} /></Card> : (
            <View style={{ gap: 12 }}>
              {data.active.map((c) => (
                <PersonLine key={c.id} p={c.person} subtitle={c.person.profession} onPress={() => navigation.navigate('PersonProfile', { userId: c.person.id })}
                  extra={!wide ? <View style={{ marginTop: 6, gap: 6 }}><Text style={[styles.stage, { color: STAGE_COLOR[c.stage] }]}>Setu: {c.stageTitle}</Text><StageDots index={c.stageIndex} color={STAGE_COLOR[c.stage]} /><Button title="Continue Journey" variant="outline" size="sm" arrow onPress={() => navigation.navigate('Journey', { connectionId: c.id })} /></View> : undefined}
                  right={wide ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View style={{ alignItems: 'center', gap: 6 }}><StatePill state="x" label={`Setu: ${c.stageTitle}`} /><StageDots index={c.stageIndex} color={STAGE_COLOR[c.stage]} /></View>
                      <Button title="Continue Journey" variant="outline" size="sm" arrow full={false} onPress={() => navigation.navigate('Journey', { connectionId: c.id })} />
                      {menu(c)}
                    </View>
                  ) : menu(c)} />
              ))}
            </View>
          )}
          <Text style={[styles.h, { marginTop: space.xl }]}>Paused Connections</Text>
          <Text style={[styles.sub, { marginBottom: space.md }]}>People you or they have paused for now.</Text>
          {!data.paused.length ? <Text style={styles.sub}>No paused connections.</Text> : (
            <View style={{ gap: 12 }}>
              {data.paused.map((c) => (
                <PersonLine key={c.id} p={c.person} onPress={() => navigation.navigate('PersonProfile', { userId: c.person.id })}
                  extra={<Text style={styles.time}>{c.pausedByMe ? 'Paused by you' : 'Paused by them'} on {formatDate(c.pausedAt)}</Text>}
                  right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{c.pausedByMe ? <Button title="Resume" variant="outline" size="sm" full={false} onPress={() => act(c, 'resume')} /> : null}{menu(c)}</View>} />
              ))}
            </View>
          )}
          <Pressable onPress={() => setShowClosed((s) => !s)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, minHeight: 44 }} accessibilityRole="button" accessibilityState={{ expanded: showClosed }}>
            <View><Text style={styles.h}>Completed / Closed</Text><Text style={styles.sub}>Past connections that you have closed.</Text></View>
            <Text style={styles.link}>{showClosed ? 'Hide' : `View (${data.closed.length})`}</Text>
          </Pressable>
          {showClosed ? <View style={{ gap: 12, marginTop: space.md }}>{data.closed.map((c) => <PersonLine key={c.id} p={c.person} extra={<Text style={styles.time}>Closed on {formatDate(c.closedAt)}</Text>} right={<StatePill state="closed" />} />)}</View> : null}
        </>
      ) : null}
      <ConfirmDialog visible={!!confirm} title={confirm?.kind === 'pause' ? `Pause your connection with ${confirm?.c.person.name}?` : `Close your connection with ${confirm?.c.person.name}?`}
        message={confirm?.kind === 'pause' ? 'You can resume at any time. They will see that the connection is paused, not why.' : 'Your chat and journey will end. This is a respectful exit; they will not see a reason.'}
        confirmLabel={confirm?.kind === 'pause' ? 'Pause' : 'Close connection'} destructive={confirm?.kind === 'close'} icon={confirm?.kind === 'pause' ? 'pause' : 'close'} tint={confirm?.kind === 'pause' ? 'amber' : undefined}
        onCancel={() => setConfirm(null)} onConfirm={() => confirm && act(confirm.c, confirm.kind)} />
      {block.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  h: { fontFamily: fonts.semibold, fontSize: 16.5, color: colors.text },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 12, height: 46 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, height: 44 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 14, height: 46 },
  filterText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  filterCount: { backgroundColor: colors.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountText: { fontFamily: fonts.bold, fontSize: 11, color: '#fff' },
  miniName: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, marginTop: 4 },
  miniAge: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  page: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pageOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  reqCard: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  name: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint },
  msg: { fontFamily: fonts.regular, fontStyle: 'italic', fontSize: 13, color: colors.textSoft, marginTop: 10 },
  quoteBox: { backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 12, marginTop: 12 },
  stage: { fontFamily: fonts.semibold, fontSize: 12.5 },
  railT: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary },
});
