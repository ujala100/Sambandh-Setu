import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminApi, AdminFeature, AdminMe, AdminMember, AdminRole, ApiError, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../context/LiveContext';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space } from '../../theme';
import {
  Button, ButtonRow, Card, CheckRow, Chip, ConfirmDialog, EmptyState, ErrorState, FilterPills, Group, IconName, InfoNote, KeyValue,
  ListRow, Loading, PasswordField, Screen, Sheet, StatePill, TextField, Toggle, Txt, useToast,
} from '../../ui';
import { formatDate, timeAgo } from '../../utils/format';

type Section = 'overview' | 'analytics' | 'verifications' | 'reports' | 'support' | 'members' | 'roles' | 'features' | 'recommendations' | 'audit';
const SECTIONS: { key: Section; label: string; icon: IconName; perms: string[] }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline', perms: ['overview.view'] },
  { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline', perms: ['analytics.view'] },
  { key: 'verifications', label: 'Verifications', icon: 'shield-checkmark-outline', perms: ['verifications.review'] },
  { key: 'reports', label: 'Reports', icon: 'flag-outline', perms: ['reports.review'] },
  { key: 'support', label: 'Support', icon: 'chatbubbles-outline', perms: ['tickets.handle'] },
  { key: 'members', label: 'Members', icon: 'people-outline', perms: ['members.view'] },
  { key: 'roles', label: 'Roles & access', icon: 'key-outline', perms: ['roles.manage'] },
  { key: 'features', label: 'Live features', icon: 'toggle-outline', perms: ['features.manage'] },
  { key: 'recommendations', label: 'Recommendations', icon: 'sparkles-outline', perms: ['recommendations.manage', 'analytics.view'] },
  { key: 'audit', label: 'Audit log', icon: 'document-text-outline', perms: ['audit.view'] },
];

const STATUS_LABEL: Record<string, string> = { active: 'Active', suspended: 'Suspended', deactivated: 'Deactivated' };
const DETAIL_LABEL: Record<string, string> = { fullName: 'Full name', dateOfBirth: 'Date of birth', idLast4: 'Last 4 digits of ID', address: 'Address', organisation: 'Organisation', role: 'Role' };
const CONTENT_LABEL: Record<string, string> = { user: 'About a member', message: 'A message', photo: 'A photo', profile: 'A profile', other: 'Other' };
const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const roleName = (key: string) => key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** Team console. What you see depends on your role's permissions; the server enforces the same rules. */
export default function Admin({ route, navigation }: any) {
  const { wide } = useLayout();
  const { refresh: refreshUser } = useAuth();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'claim' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setState('loading');
    try { setMe(await AdminApi.me()); setState('ready'); } catch (e) {
      if (e instanceof ApiError && e.status === 404) setState('claim'); else { setError(errorMessage(e)); setState('error'); }
    }
  };
  useEffect(() => { load(); }, []);

  const allowed = useMemo(() => SECTIONS.filter((s) => me && s.perms.some((p) => me.permissions.includes(p))), [me]);
  const requested = allowed.find((s) => s.key === route.params?.section)?.key;
  const section: Section = requested || allowed[0]?.key || 'overview';
  const go = (s: Section) => navigation.setParams({ section: s });
  const can = (p: string) => !!me?.permissions.includes(p);

  // Open queues next to their sections, refreshed when you move between sections.
  const [queues, setQueues] = useState<{ verifications: number; reports: number; tickets: number } | null>(null);
  const canOverview = can('overview.view');
  useEffect(() => {
    if (canOverview) AdminApi.overview().then((d) => setQueues(d.queues)).catch(() => {});
  }, [canOverview, section]);
  const pending = (s: Section) => {
    const n = s === 'verifications' ? queues?.verifications : s === 'reports' ? queues?.reports : s === 'support' ? queues?.tickets : 0;
    return n ? `${n} open` : undefined;
  };

  if (state === 'loading') return <Screen title="Team console" back="Main"><Loading /></Screen>;
  if (state === 'error') return <Screen title="Team console" back="Main"><ErrorState message={error} onRetry={load} /></Screen>;
  if (state === 'claim') return <Claim onDone={async () => { await refreshUser(); load(); }} />;

  const sectionList = (
    <Group>
      {allowed.map((s, i) => <ListRow key={s.key} icon={s.icon} title={s.label} value={pending(s.key)} selected={wide && s.key === section} onPress={() => go(s.key)} last={i === allowed.length - 1} />)}
    </Group>
  );

  // Phones: the console opens on its section list, like Settings.
  if (!wide && !requested) {
    return (
      <Screen title="Team console" subtitle={`${me!.roleName} · ${me!.permissions.length} permissions`} back="Main">
        {sectionList}
      </Screen>
    );
  }

  const nav = wide ? (
    <View>
      <Txt variant="overline">Team console</Txt>
      <Txt variant="title" style={{ marginTop: 4 }}>{me!.roleName}</Txt>
      <Txt variant="caption" style={{ marginBottom: space.lg }}>{me!.permissions.length} permissions</Txt>
      {sectionList}
    </View>
  ) : undefined;

  const body = {
    overview: <Overview go={go} />,
    analytics: <Analytics />,
    verifications: <Verifications />,
    reports: <Reports canSuspend={can('members.suspend')} />,
    support: <Support />,
    members: <Members canSuspend={can('members.suspend')} canRoles={can('members.roles')} />,
    roles: <Roles />,
    features: <Features />,
    recommendations: <Recommendations canEdit={can('recommendations.manage')} />,
    audit: <Audit />,
  }[section];

  return (
    <Screen title={SECTIONS.find((s) => s.key === section)?.label || 'Team console'} subtitle={wide ? undefined : 'Team console'}
      back={wide ? 'Main' : undefined} onBack={wide ? undefined : () => navigation.setParams({ section: undefined })} sidebar={nav} maxWidth={980}>
      {body}
    </Screen>
  );
}

// ---------------- Claim ----------------

function Claim({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claim = async () => {
    setBusy(true); setError(null);
    try { await AdminApi.claim(key.trim()); onDone(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Screen title="Team console" subtitle="For the Sambandh Setu team." back="Main" maxWidth={560}>
      <Card>
        <Txt variant="section">Activate super admin access</Txt>
        <Txt variant="body" style={{ marginVertical: 8 }}>Enter the setup key (the ADMIN_API_KEY value in the Vercel project settings). The account you are signed in with becomes the super admin. You can then give team members their own roles, so the key does not need to be shared.</Txt>
        <PasswordField label="Setup key" value={key} onChangeText={setKey} placeholder="Paste the setup key" />
        {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.md }} /> : null}
        <Button title="Activate" onPress={claim} loading={busy} disabled={key.trim().length < 24} />
      </Card>
      <InfoNote icon="lock-closed" text="Attempts are rate limited and every activation is written to the audit log." style={{ marginTop: space.lg }} />
    </Screen>
  );
}

// ---------------- Overview ----------------

function Overview({ go }: { go: (s: Section) => void }) {
  const { data, error, loading, reload } = useLoad(() => AdminApi.overview());
  const { transport } = useLive();
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const m = data.members;
  const a = data.activity;
  const q = data.queues;
  return (
    <View style={{ gap: space.lg }}>
      <Card padded={false}>
        <QueueRow label="Verifications waiting" count={q.verifications} onPress={() => go('verifications')} />
        <QueueRow label="Open reports" count={q.reports} onPress={() => go('reports')} />
        <QueueRow label="Open support requests" count={q.tickets} onPress={() => go('support')} last />
      </Card>
      <View style={styles.cols}>
        <Card style={styles.col}>
          <Txt variant="section" style={{ marginBottom: 4 }}>Members</Txt>
          <KeyValue label="Total accounts" value={String(m.total)} />
          <KeyValue label="Active" value={String(m.active)} />
          <KeyValue label="Active today" value={String(m.activeToday)} />
          <KeyValue label="Joined this week" value={String(m.newThisWeek)} />
          <KeyValue label="Finished onboarding" value={String(m.onboarded)} />
          <KeyValue label="Identity verified" value={String(m.verified)} />
          <KeyValue label="Deactivated" value={String(m.deactivated)} />
          <KeyValue label="Suspended" value={String(m.suspended)} />
          <KeyValue label="Team members" value={String(m.staff)} last />
        </Card>
        <Card style={styles.col}>
          <Txt variant="section" style={{ marginBottom: 4 }}>Activity</Txt>
          <KeyValue label="Active connections" value={String(a.activeConnections)} />
          <KeyValue label="Pending requests" value={String(a.pendingRequests)} />
          <KeyValue label="Messages in 24 hours" value={String(a.messagesToday)} />
          <KeyValue label="Family members with access" value={String(a.familyMembers)} />
          <KeyValue label="Your live connection" value={transport === 'stream' ? 'Streaming' : transport === 'poll' ? 'Polling every 15 s' : 'Off'} last />
        </Card>
      </View>
    </View>
  );
}

function QueueRow({ label, count, onPress, last }: { label: string; count: number; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${count}`} style={({ hovered }: any) => [styles.queue, !last && styles.border, hovered && { backgroundColor: colors.bg }]}>
      <Text style={styles.queueLabel}>{label}</Text>
      <Text style={[styles.queueCount, count > 0 && { color: colors.primary }]}>{count}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

// ---------------- Analytics ----------------

function Analytics() {
  const [days, setDays] = useState<'7' | '14' | '30'>('14');
  const { data, error, loading, reload } = useLoad(() => AdminApi.analytics(Number(days)), [days]);
  return (
    <View style={{ gap: space.lg }}>
      <FilterPills value={days} onChange={setDays} options={[{ key: '7', label: '7 days' }, { key: '14', label: '14 days' }, { key: '30', label: '30 days' }]} />
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <>
          <RecFunnel m={data.recommendations} />
          <Card padded={false}>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
              <View style={{ flexGrow: 1 }}>
                <View style={[styles.tr, styles.th]}>
                  {['Day', 'Sign-ups', 'Requests', 'Accepted', 'Messages', 'Impressions'].map((h, i) => <Text key={h} style={[styles.td, i === 0 && styles.tdDay, styles.thText]}>{h}</Text>)}
                </View>
                {[...data.rows].reverse().map((r) => (
                  <View key={r.day} style={styles.tr}>
                    <Text style={[styles.td, styles.tdDay]}>{formatDate(`${r.day}T12:00:00`)}</Text>
                    {[r.signups, r.requests, r.accepted, r.messages, r.impressions].map((n, i) => <Text key={i} style={styles.td}>{n}</Text>)}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        </>
      ) : null}
    </View>
  );
}

function RecFunnel({ m }: { m: { days: number; counts: Record<string, number>; rates: Record<string, number | null> } }) {
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`);
  return (
    <Card>
      <Txt variant="section">Recommendations, last {m.days} days</Txt>
      <KeyValue label="Profiles shown" value={String(m.counts.impressions)} />
      <KeyValue label="Profiles opened" value={`${m.counts.views} (${pct(m.rates.viewRate)} of shown)`} />
      <KeyValue label="Interest sent" value={`${m.counts.interests} (${pct(m.rates.interestRate)} of shown)`} />
      <KeyValue label="Skipped" value={`${m.counts.skips} (${pct(m.rates.skipRate)} of shown)`} />
      <KeyValue label="Requests accepted" value={`${m.counts.accepted} (${pct(m.rates.acceptanceRate)} of answered)`} last />
    </Card>
  );
}

// ---------------- Verifications ----------------

function Verifications() {
  const toast = useToast();
  const [status, setStatus] = useState<'in_review' | 'verified' | 'needs_action' | 'all'>('in_review');
  const { data, error, loading, reload } = useLoad(() => AdminApi.verifications(status), [status]);
  const [docs, setDocs] = useState<Record<string, string[]>>({});
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const decide = async (id: string, s: 'verified' | 'needs_action', n?: string) => {
    try { await AdminApi.decideVerification(id, s, n); toast.show(s === 'verified' ? 'Marked as verified' : 'Sent back to the member'); setNoteFor(null); setNote(''); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const showDocs = async (id: string) => {
    if (docs[id]) return setDocs((d) => { const n = { ...d }; delete n[id]; return n; });
    try { const r = await AdminApi.verificationDocs(id); setDocs((d) => ({ ...d, [id]: r.docs })); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  return (
    <View style={{ gap: space.lg }}>
      <FilterPills value={status} onChange={setStatus} options={[{ key: 'in_review', label: 'In review' }, { key: 'needs_action', label: 'Needs action' }, { key: 'verified', label: 'Verified' }, { key: 'all', label: 'All' }]} />
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? <Card><EmptyState icon="shield-checkmark-outline" tint="green" title="Nothing here" text="No verification requests in this list." /></Card> : data.items.map((v) => (
        <Card key={v.id}>
          <View style={styles.rowHead}>
            <View style={{ flex: 1 }}><Text style={styles.name}>{v.name}</Text><Text style={styles.small}>{v.email}</Text></View>
            <StatePill state={v.status} />
          </View>
          <KeyValue label="Type" value={`${cap(v.type)} · ${v.docType}`} />
          {Object.entries(v.details || {}).filter(([, val]) => val).map(([k, val]) => <KeyValue key={k} label={DETAIL_LABEL[k] || k} value={String(val)} />)}
          <KeyValue label="Submitted" value={`${formatDate(v.createdAt)} (${timeAgo(v.createdAt)})`} last />
          {v.reviewerNote ? <InfoNote text={`Note: ${v.reviewerNote}`} style={{ marginTop: 8 }} /> : null}
          {docs[v.id] ? <View style={styles.imgs}>{docs[v.id].map((src, i) => <Image key={i} source={{ uri: src }} style={styles.doc} resizeMode="contain" accessibilityLabel={`Document ${i + 1}`} />)}</View> : null}
          <View style={styles.actions}>
            <Button title={docs[v.id] ? 'Hide documents' : `View documents (${v.documents})`} variant="ghost" size="sm" full={false} onPress={() => showDocs(v.id)} />
            {v.status !== 'verified' ? <Button title="Approve" size="sm" full={false} icon="checkmark" onPress={() => decide(v.id, 'verified')} /> : null}
            {v.status === 'in_review' ? <Button title="Needs action" variant="outline" size="sm" full={false} onPress={() => setNoteFor(v.id)} /> : null}
          </View>
        </Card>
      ))}
      <Sheet visible={!!noteFor} onClose={() => setNoteFor(null)} title="What should the member fix?">
        <TextField multiline value={note} onChangeText={(t) => setNote(t.slice(0, 300))} counter={300} placeholder="e.g. The photo is blurry. Please upload a clear photo of the front side." />
        <Button title="Send back to member" onPress={() => noteFor && decide(noteFor, 'needs_action', note)} disabled={!note.trim()} />
      </Sheet>
    </View>
  );
}

// ---------------- Reports ----------------

function Reports({ canSuspend }: { canSuspend: boolean }) {
  const toast = useToast();
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const { data, error, loading, reload } = useLoad(() => AdminApi.reports(status), [status]);
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [suspendFor, setSuspendFor] = useState<any>(null);
  const close = async (id: string, action: 'none' | 'suspend', note?: string) => {
    try { await AdminApi.closeReport(id, action, note); toast.show(action === 'suspend' ? 'Closed and member suspended' : 'Report closed'); setSuspendFor(null); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const show = async (id: string) => {
    if (images[id]) return setImages((d) => { const n = { ...d }; delete n[id]; return n; });
    try { const r = await AdminApi.reportImages(id); setImages((d) => ({ ...d, [id]: r.images })); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  return (
    <View style={{ gap: space.lg }}>
      <FilterPills value={status} onChange={setStatus} options={[{ key: 'open', label: 'Open' }, { key: 'closed', label: 'Closed' }, { key: 'all', label: 'All' }]} />
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? <Card><EmptyState icon="flag-outline" tint="green" title="No reports" text="Nothing has been reported in this list." /></Card> : data.items.map((r) => (
        <Card key={r.id}>
          <View style={styles.rowHead}>
            <View style={{ flex: 1 }}><Text style={styles.name}>{r.reason}</Text><Text style={styles.small}>{CONTENT_LABEL[r.contentType] || cap(r.contentType)} · {timeAgo(r.createdAt)}</Text></View>
            <StatePill state={r.status === 'open' ? 'pending' : 'completed'} label={r.status === 'open' ? 'Open' : 'Closed'} />
          </View>
          <KeyValue label="Reported by" value={`${r.reporter.name} (${r.reporter.email})`} />
          <KeyValue label="Member reported" value={r.reported ? `${r.reported.name} (${r.reported.email}) · ${STATUS_LABEL[r.reported.status] || r.reported.status} · ${r.reported.reportsAgainst} report${r.reported.reportsAgainst === 1 ? '' : 's'} in total` : 'Not about a member'} last={!r.details} />
          {r.details ? <Text style={[styles.body, { marginTop: 8 }]}>“{r.details}”</Text> : null}
          {images[r.id] ? <View style={styles.imgs}>{images[r.id].map((src, i) => <Image key={i} source={{ uri: src }} style={styles.doc} resizeMode="contain" accessibilityLabel={`Screenshot ${i + 1}`} />)}</View> : null}
          <View style={styles.actions}>
            {r.screenshots ? <Button title={images[r.id] ? 'Hide screenshots' : `Screenshots (${r.screenshots})`} variant="ghost" size="sm" full={false} onPress={() => show(r.id)} /> : null}
            {r.status === 'open' ? <Button title="Close" variant="outline" size="sm" full={false} onPress={() => close(r.id, 'none')} /> : null}
            {r.status === 'open' && canSuspend && r.reported && r.reported.status !== 'suspended' ? <Button title="Close and suspend" variant="danger" size="sm" full={false} onPress={() => setSuspendFor(r)} /> : null}
          </View>
        </Card>
      ))}
      <ConfirmDialog visible={!!suspendFor} destructive icon="ban-outline" title={`Suspend ${suspendFor?.reported?.name}?`} message="They are signed out everywhere and cannot sign in until reactivated. Their profile disappears from Discover." confirmLabel="Suspend" onCancel={() => setSuspendFor(null)} onConfirm={() => close(suspendFor.id, 'suspend', 'Suspended from report review')} />
    </View>
  );
}

// ---------------- Support ----------------

function Support() {
  const toast = useToast();
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const { data, error, loading, reload } = useLoad(() => AdminApi.tickets(status), [status]);
  const [replyFor, setReplyFor] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const send = async () => {
    try { await AdminApi.closeTicket(replyFor.id, reply, note); toast.show('Reply sent and request closed'); setReplyFor(null); setReply(''); setNote(''); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  return (
    <View style={{ gap: space.lg }}>
      <FilterPills value={status} onChange={setStatus} options={[{ key: 'open', label: 'Open' }, { key: 'closed', label: 'Closed' }, { key: 'all', label: 'All' }]} />
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? <Card><EmptyState icon="chatbubbles-outline" tint="green" title="No requests" text="No support requests in this list." /></Card> : data.items.map((t) => (
        <Card key={t.id}>
          <View style={styles.rowHead}>
            <View style={{ flex: 1 }}><Text style={styles.name}>{t.reference} · {t.category}</Text><Text style={styles.small}>{t.member.name} ({t.member.email}) · {timeAgo(t.createdAt)}</Text></View>
            <StatePill state={t.status === 'open' ? 'pending' : 'completed'} label={t.kind === 'problem' ? 'Problem' : 'Support'} />
          </View>
          {t.subject ? <Text style={styles.name}>{t.subject}</Text> : null}
          <Text style={[styles.body, { marginTop: 4 }]}>{t.message}</Text>
          {t.status === 'open' ? <View style={styles.actions}><Button title="Reply and close" size="sm" full={false} icon="send-outline" onPress={() => setReplyFor(t)} /></View> : null}
        </Card>
      ))}
      <Sheet visible={!!replyFor} onClose={() => setReplyFor(null)} title={`Reply to ${replyFor?.reference || ''}`}>
        <TextField label="Reply to the member" optional multiline value={reply} onChangeText={(t) => setReply(t.slice(0, 300))} counter={300} helper="Sent as an in-app notification." />
        <TextField label="Internal note" optional value={note} onChangeText={(t) => setNote(t.slice(0, 300))} helper="Only the team sees this, in the audit log." />
        <Button title="Send and close" onPress={send} />
      </Sheet>
    </View>
  );
}

// ---------------- Members ----------------

function Members({ canSuspend, canRoles }: { canSuspend: boolean; canRoles: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'suspended' | 'deactivated'>('');
  const [staffOnly, setStaffOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => AdminApi.members({ q: query, status, role: staffOnly ? 'staff' : undefined, page }), [query, status, staffOnly, page]);
  const { data: roles } = useLoad(() => (canRoles ? AdminApi.roles() : Promise.resolve(null)), [canRoles], { onFocus: false });
  return (
    <View style={{ gap: space.lg }}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.faint} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => { setPage(1); setQuery(q.trim()); }} placeholder="Search by name or email, press Enter" placeholderTextColor={colors.faint} style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} accessibilityLabel="Search members" returnKeyType="search" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <FilterPills value={status || 'all'} onChange={(k) => { setPage(1); setStatus(k === 'all' ? '' : (k as any)); }} options={[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'suspended', label: 'Suspended' }, { key: 'deactivated', label: 'Deactivated' }]} />
        <Chip label="Team only" selected={staffOnly} onPress={() => { setPage(1); setStaffOnly((s) => !s); }} />
      </View>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? <Card><EmptyState icon="people-outline" title="No members found" /></Card> : (
        <>
          <Text style={styles.small}>{data.total} member{data.total === 1 ? '' : 's'}</Text>
          {data.items.map((m) => (
            <MemberRow key={m.id} m={m} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} canSuspend={canSuspend} canRoles={canRoles}
              roles={roles?.roles.filter((r) => r.grantable) || []} onChanged={() => { reload(); toast.show('Saved'); }} />
          ))}
          {data.totalPages > 1 ? (
            <ButtonRow>
              <Button title="Previous" variant="ghost" size="sm" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
              <Button title={`Next (${page}/${data.totalPages})`} variant="ghost" size="sm" disabled={page >= data.totalPages} onPress={() => setPage((p) => p + 1)} />
            </ButtonRow>
          ) : null}
        </>
      )}
    </View>
  );
}

function MemberRow({ m, open, onToggle, canSuspend, canRoles, roles, onChanged }: { m: AdminMember; open: boolean; onToggle: () => void; canSuspend: boolean; canRoles: boolean; roles: AdminRole[]; onChanged: () => void }) {
  const toast = useToast();
  const [detail, setDetail] = useState<any>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (open && !detail) AdminApi.member(m.id).then(setDetail).catch((e) => toast.show(errorMessage(e), 'error')); }, [open]);
  const act = async (fn: () => Promise<any>) => { try { await fn(); setConfirm(false); setDetail(null); onChanged(); } catch (e) { toast.show(errorMessage(e), 'error'); } };
  return (
    <Card padded={false}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.memberHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{m.name || '(no name)'} {m.verified ? <Ionicons name="checkmark-circle" size={14} color={colors.primary} /> : null}</Text>
          <Text style={styles.small}>{m.email} · joined {formatDate(m.createdAt)}{m.lastActiveAt ? ` · active ${timeAgo(m.lastActiveAt)}` : ''}</Text>
        </View>
        {m.role !== 'member' ? <StatePill state="x" label={roleName(m.role)} /> : null}
        <StatePill state={m.status === 'active' ? 'active' : m.status === 'suspended' ? 'closed' : 'paused'} label={STATUS_LABEL[m.status] || m.status} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {!detail ? <Loading /> : (
            <>
              <KeyValue label="Phone" value={detail.phone || 'Not added'} />
              <KeyValue label="Profile" value={[detail.profile.age && `${detail.profile.age}`, detail.profile.gender, detail.profile.location, detail.profile.profession].filter(Boolean).join(' · ')} />
              <KeyValue label="Email confirmed" value={detail.emailVerified ? 'Yes' : 'No'} />
              <KeyValue label="Onboarding" value={detail.onboardingCompleted ? 'Finished' : 'Not finished'} />
              <KeyValue label="Connections" value={String(detail.counts.connections)} />
              <KeyValue label="Requests sent" value={String(detail.counts.requestsSent)} />
              <KeyValue label="Reports against" value={String(detail.counts.reportsAgainst)} />
              <KeyValue label="Blocked by" value={`${detail.counts.blockedBy} member${detail.counts.blockedBy === 1 ? '' : 's'}`} />
              <KeyValue label="Verifications" value={detail.verifications.map((v: any) => `${v.type}: ${v.status.replace('_', ' ')}`).join(', ') || 'None'} last />
              {canRoles ? (
                <View style={{ marginTop: space.md }}>
                  <Text style={styles.label}>Role</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {roles.map((r) => <Chip key={r.key} label={r.name} selected={detail.role === r.key} onPress={() => detail.role !== r.key && act(() => AdminApi.setRole(m.id, r.key))} />)}
                  </View>
                  <Text style={[styles.small, { marginTop: 6 }]}>You can assign roles whose permissions you hold yourself.</Text>
                </View>
              ) : null}
              {canSuspend ? (
                <View style={styles.actions}>
                  {detail.status === 'active' ? <Button title="Suspend" variant="dangerOutline" size="sm" full={false} icon="ban-outline" onPress={() => setConfirm(true)} />
                    : <Button title="Reactivate" variant="outline" size="sm" full={false} icon="refresh" onPress={() => act(() => AdminApi.reactivate(m.id))} />}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      <ConfirmDialog visible={confirm} destructive icon="ban-outline" title={`Suspend ${m.name}?`} message="They are signed out everywhere and cannot sign in until reactivated." confirmLabel="Suspend"
        onCancel={() => setConfirm(false)} onConfirm={() => act(() => AdminApi.suspend(m.id, 'Suspended from member review'))} />
    </Card>
  );
}

// ---------------- Roles ----------------

function Box({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <View style={[styles.box, checked && styles.boxOn, disabled && { opacity: 0.45 }]}>
      {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
    </View>
  );
}

function Roles() {
  const toast = useToast();
  const { wide } = useLayout();
  const { data, error, loading, reload } = useLoad(() => AdminApi.roles());
  const [sel, setSel] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', description: '', permissions: [] as string[] });
  const [del, setDel] = useState<AdminRole | null>(null);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const perms = data!.permissions;
  const columns = data!.roles.filter((r) => !r.locked);
  const fixed = data!.roles.filter((r) => r.locked);
  const current = (r: AdminRole) => edits[r.key] || r.permissions;
  const toggle = (r: AdminRole, p: string) => {
    const now = current(r);
    const next = now.includes(p) ? now.filter((x) => x !== p) : [...now, p];
    setEdits((e) => {
      const n = { ...e };
      if ([...next].sort().join() === [...r.permissions].sort().join()) delete n[r.key]; else n[r.key] = next;
      return n;
    });
  };
  const dirty = Object.keys(edits);
  const saveAll = async () => {
    setSaving(true);
    try {
      for (const key of dirty) await AdminApi.updateRole(key, { permissions: edits[key] });
      setEdits({});
      toast.show(dirty.length === 1 ? 'Role updated' : `${dirty.length} roles updated`);
      reload();
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const create = async () => {
    try { await AdminApi.createRole(form); setCreating(false); setForm({ key: '', name: '', description: '', permissions: [] }); toast.show('Role created'); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  return (
    <View style={{ gap: space.lg }}>
      <InfoNote icon="key-outline" text="Each account has one role. Changes apply across the platform within seconds. Nobody can grant permissions they do not hold, change their own role, or remove the last super admin." />
      {!wide && columns.length ? (() => {
        const r = columns.find((c) => c.key === sel) || columns[0];
        return (
          <>
            <View style={styles.chips}>{columns.map((c) => <Chip key={c.key} label={c.name} selected={c.key === r.key} onPress={() => setSel(c.key)} />)}</View>
            <Card padded={false}>
              {perms.map((p, i) => {
                const on = current(r).includes(p.key);
                return (
                  <Pressable key={p.key} onPress={() => toggle(r, p.key)} style={[styles.permRow, i < perms.length - 1 && styles.border, on !== r.permissions.includes(p.key) && { backgroundColor: colors.primarySoft }]}
                    accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${r.name}: ${p.label}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.label}</Text>
                      <Text style={[styles.small, { fontSize: 11.5 }]}>{p.key}</Text>
                    </View>
                    <Box checked={on} />
                  </Pressable>
                );
              })}
            </Card>
          </>
        );
      })() : null}
      {wide ? (
      <Card padded={false}>
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flexGrow: 1 }}>
            <View style={[styles.mRow, styles.th]}>
              <Text style={[styles.mLabel, styles.thText]}>Permission</Text>
              {columns.map((r) => (
                <View key={r.key} style={styles.mCell}>
                  <Text style={[styles.thText, { textAlign: 'center' }]} numberOfLines={2}>{r.name}</Text>
                  <Text style={[styles.small, { fontSize: 11, textAlign: 'center' }]}>{r.members} {r.members === 1 ? 'account' : 'accounts'}</Text>
                </View>
              ))}
            </View>
            {perms.map((p, i) => (
              <View key={p.key} style={[styles.mRow, i < perms.length - 1 && styles.border]}>
                <View style={styles.mLabel}>
                  <Text style={styles.name}>{p.label}</Text>
                  <Text style={[styles.small, { fontSize: 11.5 }]}>{p.key}</Text>
                </View>
                {columns.map((r) => {
                  const on = current(r).includes(p.key);
                  const changed = on !== r.permissions.includes(p.key);
                  return (
                    <Pressable key={r.key} onPress={() => toggle(r, p.key)} style={[styles.mCell, changed && { backgroundColor: colors.primarySoft }]}
                      accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${r.name}: ${p.label}`}>
                      <Box checked={on} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>
      ) : null}
      {dirty.length ? (
        <ButtonRow>
          <Button title="Discard" variant="ghost" onPress={() => setEdits({})} />
          <Button title={`Save changes to ${dirty.length} ${dirty.length === 1 ? 'role' : 'roles'}`} onPress={saveAll} loading={saving} />
        </ButtonRow>
      ) : null}
      <Card padded={false}>
        {[...fixed, ...columns].map((r, i, all) => (
          <View key={r.key} style={[styles.roleRow, i < all.length - 1 && styles.border]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.name} <Text style={styles.small}>({r.key}){r.builtIn ? '' : ' · custom'}</Text></Text>
              <Text style={styles.small}>
                {r.description || 'No description'} · {r.members} {r.members === 1 ? 'account' : 'accounts'}
                {r.locked ? '' : ` · ${r.permissions.length} of ${perms.length} permissions`}
              </Text>
            </View>
            {!r.builtIn ? <Button title="Delete" variant="dangerOutline" size="sm" full={false} onPress={() => setDel(r)} /> : null}
          </View>
        ))}
      </Card>
      <View><Button title="Create a custom role" variant="secondary" icon="add" full={false} onPress={() => setCreating(true)} /></View>
      <Sheet visible={creating} onClose={() => setCreating(false)} title="New role" maxWidth={620}>
        <ScrollView style={{ maxHeight: 520 }}>
          <TextField label="Name" required value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="e.g. Community lead" />
          <TextField label="Key" required value={form.key} onChangeText={(t) => setForm((f) => ({ ...f, key: t.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="e.g. community_lead" autoCapitalize="none" helper="Lowercase letters, numbers and underscores. It cannot be changed later." />
          <TextField label="Description" optional value={form.description} onChangeText={(t) => setForm((f) => ({ ...f, description: t }))} />
          <Text style={styles.label}>Permissions</Text>
          {perms.map((p) => <CheckRow key={p.key} label={p.label} description={p.key} checked={form.permissions.includes(p.key)} onPress={() => setForm((f) => ({ ...f, permissions: f.permissions.includes(p.key) ? f.permissions.filter((x) => x !== p.key) : [...f.permissions, p.key] }))} />)}
        </ScrollView>
        <Button title="Create role" onPress={create} disabled={form.key.length < 3 || !form.name.trim()} style={{ marginTop: space.md }} />
      </Sheet>
      <ConfirmDialog visible={!!del} destructive icon="trash-outline" title={`Delete ${del?.name}?`} message="Anyone with this role goes back to Member." confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={async () => { try { await AdminApi.deleteRole(del!.key); setDel(null); toast.show('Role deleted'); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); } }} />
    </View>
  );
}

// ---------------- Live features ----------------

function audienceText(f: { enabled: boolean; rollout: number; roles: string[] }, names: Record<string, string>) {
  if (!f.enabled) return 'Off for everyone';
  const who = f.roles.length ? f.roles.map((k) => names[k] || roleName(k)).join(', ') : '';
  if (f.rollout <= 0) return 'On, but rolled out to nobody (0%)';
  if (f.rollout >= 100) return who ? `On for ${who} only` : 'On for everyone';
  return who ? `On for ${f.rollout}% of ${who}` : `On for ${f.rollout}% of members`;
}

function Features() {
  const toast = useToast();
  const { refreshFeatures } = useLive();
  const { data, error, loading, reload, setData } = useLoad(() => AdminApi.features());
  const [drafts, setDrafts] = useState<Record<string, Partial<AdminFeature>>>({});
  const [open, setOpen] = useState<string | null>(null);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const names: Record<string, string> = Object.fromEntries(data!.roles.map((r) => [r.key, r.name]));
  const clear = (key: string) => setDrafts((dr) => { const n = { ...dr }; delete n[key]; return n; });
  const save = async (key: string, patch: Partial<AdminFeature>, keepDraft = false) => {
    try {
      const f = await AdminApi.updateFeature(key, patch as any);
      setData((d) => d && { ...d, features: d.features.map((x) => (x.key === key ? f : x)) });
      if (!keepDraft) { clear(key); setOpen(null); }
      refreshFeatures();
      toast.show(`${f.name}: ${audienceText(f, names).toLowerCase()}`);
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const groups = [...new Set(data!.features.map((f) => f.group))];
  return (
    <View style={{ gap: space.lg }}>
      <InfoNote icon="flash-outline" text="Changes are live: the API enforces them at once and open apps update within seconds. Turning a feature off never deletes anyone's data." />
      {groups.map((g) => (
        <View key={g} style={{ gap: space.sm }}>
          <Txt variant="overline">{g}</Txt>
          <Card padded={false}>
            {data!.features.filter((f) => f.group === g).map((f, i, list) => {
              const d = { ...f, ...drafts[f.key] };
              const dirty = !!drafts[f.key];
              const set = (patch: Partial<AdminFeature>) => setDrafts((dr) => ({ ...dr, [f.key]: { ...dr[f.key], ...patch } }));
              const targetable = !['maintenance', 'announcement', 'signups'].includes(f.key);
              const expanded = targetable && (open === f.key || (dirty && (drafts[f.key]?.rollout !== undefined || drafts[f.key]?.roles !== undefined)));
              const hasText = f.configFields.includes('text') || f.configFields.includes('message');
              return (
                <View key={f.key} style={[styles.feature, i < list.length - 1 && styles.border]}>
                  <View style={styles.rowHead}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.name}>{f.name}</Text>
                      <Text style={styles.small}>{f.description}</Text>
                    </View>
                    <Toggle value={f.enabled} onChange={(v) => save(f.key, { enabled: v }, true)} label={f.name} />
                  </View>
                  <View style={styles.featureMeta}>
                    <Text style={[styles.metaText, { color: f.enabled ? colors.text : colors.muted }]}>{targetable ? audienceText(f, names) : f.enabled ? 'On' : 'Off'}</Text>
                    <Text style={styles.small}>{f.updatedAt ? `Changed ${timeAgo(f.updatedAt)}` : 'Default setting'}</Text>
                    {targetable && !expanded ? <Pressable onPress={() => setOpen(f.key)} accessibilityRole="button"><Text style={styles.link}>Change rollout</Text></Pressable> : null}
                  </View>
                  {expanded ? (
                    <View style={styles.rollout}>
                      <Text style={styles.label}>Share of members</Text>
                      <View style={styles.chips}>{[0, 10, 25, 50, 100].map((n) => <Chip key={n} size="sm" label={`${n}%`} selected={d.rollout === n} onPress={() => set({ rollout: n })} />)}</View>
                      <Text style={styles.label}>Roles</Text>
                      <View style={styles.chips}>
                        <Chip size="sm" label="All roles" selected={!d.roles.length} onPress={() => set({ roles: [] })} />
                        {data!.roles.map((r) => <Chip key={r.key} size="sm" label={r.name} selected={d.roles.includes(r.key)} onPress={() => set({ roles: d.roles.includes(r.key) ? d.roles.filter((x) => x !== r.key) : [...d.roles, r.key] })} />)}
                      </View>
                      <Text style={[styles.small, { marginTop: space.sm }]}>After saving: {audienceText({ ...d, enabled: f.enabled }, names).toLowerCase()}. Members already in a rollout stay in it when you raise the share.</Text>
                      <View style={styles.actions}>
                        <Button title="Save rollout" size="sm" full={false} disabled={!dirty} onPress={() => save(f.key, { rollout: d.rollout, roles: d.roles })} />
                        <Button title="Cancel" variant="ghost" size="sm" full={false} onPress={() => { clear(f.key); setOpen(null); }} />
                      </View>
                    </View>
                  ) : null}
                  {hasText ? (
                    <View style={{ marginTop: space.md }}>
                      {f.configFields.includes('text') ? <TextField label="Banner text" value={d.config.text || ''} onChangeText={(t) => set({ config: { ...d.config, text: t.slice(0, 240) } })} counter={240} placeholder="e.g. Scheduled update tonight at 11 pm." /> : null}
                      {f.configFields.includes('message') ? <TextField label="Message shown to members" value={d.config.message || ''} onChangeText={(t) => set({ config: { ...d.config, message: t.slice(0, 240) } })} counter={240} placeholder="Sambandh Setu is being updated. You can browse, but changes are paused for a few minutes." /> : null}
                      {f.configFields.includes('tone') ? (
                        <View style={[styles.chips, { marginBottom: space.sm }]}>{(['info', 'success', 'warning'] as const).map((t) => <Chip key={t} size="sm" label={t === 'info' ? 'Information' : t === 'success' ? 'Good news' : 'Warning'} selected={(d.config.tone || 'info') === t} onPress={() => set({ config: { ...d.config, tone: t } })} />)}</View>
                      ) : null}
                      {dirty && drafts[f.key]?.config ? (
                        <View style={styles.actions}>
                          <Button title="Save message" size="sm" full={false} onPress={() => save(f.key, { config: d.config })} />
                          <Button title="Cancel" variant="ghost" size="sm" full={false} onPress={() => clear(f.key)} />
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </View>
  );
}

// ---------------- Recommendations ----------------

function Recommendations({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => AdminApi.recommender());
  const [w, setW] = useState<Record<string, number> | null>(null);
  const [t, setT] = useState<Record<string, number> | null>(null);
  useEffect(() => { if (data) { setW(data.weights); setT(data.tuning); } }, [data]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!w || !t) return null;
  const total = Object.values(w).reduce((a, x) => a + x, 0) || 1;
  const dirty = JSON.stringify(w) !== JSON.stringify(data!.weights) || JSON.stringify(t) !== JSON.stringify(data!.tuning);
  const save = async (reset = false) => {
    try { await AdminApi.updateRecommender(reset ? { reset: true } : { weights: w, tuning: t }); toast.show(reset ? 'Back to defaults' : 'Ranking updated'); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const TUNING: Record<string, { label: string; step: number; max: number; min?: number; fmt?: (v: number) => string }> = {
    diversity: { label: 'Variety in results (0 = pure relevance)', step: 0.05, max: 0.9 },
    freshDays: { label: 'A member counts as new for (days)', step: 1, max: 60, fmt: (v) => `${v} days` },
    freshBoost: { label: 'Boost for new members', step: 0.01, max: 0.3 },
    exploreEvery: { label: 'Show a new member every N results (0 = off)', step: 1, max: 20, fmt: (v) => (v ? `every ${v}` : 'off') },
    popularityDamping: { label: 'Spread attention away from busy profiles', step: 0.05, max: 1 },
  };
  return (
    <View style={{ gap: space.lg }}>
      <InfoNote icon="sparkles-outline" text="Discover ranks people by how well both fit each other's preferences, shared values and interests, location, intent, and what each member engaged with before, then mixes in variety and new members. Members see reasons, never scores." />
      <RecFunnel m={data!.metrics} />
      <Card>
        <Txt variant="section" style={{ marginBottom: 6 }}>Signals and weights</Txt>
        {Object.keys(w).map((k) => (
          <Stepper key={k} label={data!.labels[k] || k} value={w[k]} share={w[k] / total} step={0.01} max={1} disabled={!canEdit}
            onChange={(v) => setW((s) => ({ ...s!, [k]: v }))} defaultValue={data!.defaults.weights[k]} />
        ))}
      </Card>
      <Card>
        <Txt variant="section" style={{ marginBottom: 6 }}>Variety and fairness</Txt>
        {Object.keys(t).map((k) => (
          <Stepper key={k} label={TUNING[k]?.label || k} value={t[k]} step={TUNING[k]?.step || 0.01} max={TUNING[k]?.max || 1} disabled={!canEdit} format={TUNING[k]?.fmt}
            onChange={(v) => setT((s) => ({ ...s!, [k]: v }))} defaultValue={data!.defaults.tuning[k]} />
        ))}
      </Card>
      {canEdit ? (
        <ButtonRow>
          <Button title="Reset to defaults" variant="ghost" onPress={() => save(true)} />
          <Button title="Save ranking" onPress={() => save(false)} disabled={!dirty} />
        </ButtonRow>
      ) : <InfoNote text="You can view these settings. Changing them needs the Tune recommendations permission." />}
    </View>
  );
}

function Stepper({ label, value, step, max, onChange, disabled, share, defaultValue, format }: { label: string; value: number; step: number; max: number; onChange: (v: number) => void; disabled?: boolean; share?: number; defaultValue?: number; format?: (v: number) => string }) {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const set = (v: number) => onChange(round(Math.max(0, Math.min(max, v))));
  const show = (v: number) => (format ? format(v) : v.toFixed(step < 1 ? 2 : 0));
  return (
    <View style={styles.stepRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        {defaultValue !== undefined && defaultValue !== value ? <Text style={styles.small}>Default {show(defaultValue)}</Text> : null}
        {share !== undefined ? <View style={styles.shareTrack}><View style={[styles.shareFill, { width: `${Math.round(share * 100)}%` as any }]} /></View> : null}
      </View>
      <Pressable onPress={() => set(value - step)} disabled={disabled} style={[styles.stepBtn, disabled && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={`Decrease ${label}`}><Ionicons name="remove" size={16} color={colors.text} /></Pressable>
      <Text style={styles.stepValue}>{show(value)}</Text>
      <Pressable onPress={() => set(value + step)} disabled={disabled} style={[styles.stepBtn, disabled && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={`Increase ${label}`}><Ionicons name="add" size={16} color={colors.text} /></Pressable>
    </View>
  );
}

// ---------------- Audit ----------------

const ACTION: Record<string, string> = {
  claim_super_admin: 'Activated super admin access',
  set_role: 'Changed a member’s role',
  suspend_user: 'Suspended a member',
  reactivate_user: 'Reactivated a member',
  view_member: 'Opened a member’s account',
  verification_verified: 'Approved a verification',
  verification_needs_action: 'Sent a verification back',
  view_verification_docs: 'Viewed verification documents',
  close_report: 'Closed a report',
  view_report_images: 'Viewed report screenshots',
  close_ticket: 'Closed a support request',
  create_role: 'Created a role',
  update_role: 'Edited a role',
  delete_role: 'Deleted a role',
  update_feature: 'Changed a live feature',
  tune_recommender: 'Tuned recommendations',
};
const NAMED_REF = ['create_role', 'update_role', 'delete_role', 'update_feature'];

function Audit() {
  const { data, error, loading, reload } = useLoad(() => AdminApi.audit());
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.items.length) return <Card><EmptyState icon="document-text-outline" title="No actions yet" /></Card>;
  return (
    <Card padded={false}>
      {data.items.map((e, i) => {
        const subject = e.target || (NAMED_REF.includes(e.action) ? e.refId : null);
        return (
          <View key={e.id} style={[styles.audit, i > 0 && styles.borderTop]}>
            <Text style={styles.auditTime}>{formatDate(e.createdAt)}{'\n'}{new Date(e.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{ACTION[e.action] || e.action.replace(/_/g, ' ')}{subject ? <Text style={styles.body}>{`: ${subject}`}</Text> : null}</Text>
              <Text style={styles.small}>By {e.actor}</Text>
              {e.note ? <Text style={[styles.body, { marginTop: 2 }]}>{e.note}</Text> : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  col: { flexGrow: 1, flexBasis: 320 },
  queue: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
  queueLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  queueCount: { fontFamily: fonts.bold, fontSize: 18, color: colors.muted },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  name: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSoft },
  label: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text, marginTop: space.md, marginBottom: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.md },
  imgs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space.md },
  doc: { width: 260, height: 180, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { backgroundColor: colors.bg },
  td: { flex: 1, minWidth: 96, paddingVertical: 10, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 13, color: colors.text, textAlign: 'right' },
  tdDay: { flex: 1.3, minWidth: 124, textAlign: 'left' },
  thText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 12, height: 46 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, height: 44 },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  permCell: { flexBasis: 300, flexGrow: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  shareTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, maxWidth: 260 },
  shareFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepValue: { width: 64, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  audit: { flexDirection: 'row', gap: 14, padding: 14 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  mRow: { flexDirection: 'row', alignItems: 'stretch' },
  mLabel: { flex: 1, minWidth: 250, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center' },
  mCell: { width: 96, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  feature: { padding: 16 },
  featureMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 },
  metaText: { fontFamily: fonts.semibold, fontSize: 13 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  rollout: { marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  auditTime: { width: 104, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
