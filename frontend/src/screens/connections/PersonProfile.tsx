import React, { useState } from 'react';
import { View } from 'react-native';
import { People, PersonProfile as P, Requests, errorMessage } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { space } from '../../theme';
import { Button, ButtonRow, Card, ErrorState, IconButton, InfoNote, Loading, Screen, Txt, useToast } from '../../ui';
import { ProfileDetail } from '../../components/ProfileDetail';
import { ActionMenu, useBlock } from '../../components/People';
import { nameAge } from '../../utils/format';

/** Actions for another member, depending on the relationship. */
export function usePersonActions(p: P | null | undefined, after: () => void, navigation: any) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<any>, msg?: string) => {
    setBusy(key);
    try { await fn(); if (msg) toast.show(msg); after(); } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };
  const block = useBlock(() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'));
  if (!p) return { bar: null, menu: null, dialog: block.dialog };

  let bar: React.ReactNode = null;
  if (p.relation === 'none' || p.relation === 'closed') {
    bar = (
      <ButtonRow>
        <Button title="Not Interested" variant="outline" icon="close" onPress={() => run('skip', () => People.skip(p.id), 'We won\'t show this profile again').then(() => navigation.canGoBack() && navigation.goBack())} loading={busy === 'skip'} />
        <Button title="Interested" icon="heart" onPress={() => run('send', () => Requests.send(p.id), `Interest sent to ${p.name}`)} loading={busy === 'send'} />
      </ButtonRow>
    );
  } else if (p.relation === 'request_received' && p.requestId) {
    bar = (
      <ButtonRow>
        <Button title="Decline" variant="outline" onPress={() => run('decline', () => Requests.decline(p.requestId!), 'Request declined')} loading={busy === 'decline'} />
        <Button title="Accept" icon="checkmark" onPress={() => run('accept', async () => { const r = await Requests.accept(p.requestId!); navigation.navigate('Journey', { connectionId: r.connectionId }); }, `You and ${p.name} are now connected`)} loading={busy === 'accept'} />
      </ButtonRow>
    );
  } else if (p.relation === 'request_sent' && p.requestId) {
    bar = (
      <View style={{ gap: 10 }}>
        <InfoNote icon="time-outline" text={`Interest sent. Waiting for ${p.name} to respond.`} />
        <Button title="Withdraw Interest" variant="outline" onPress={() => run('withdraw', () => Requests.withdraw(p.requestId!), 'Interest withdrawn')} loading={busy === 'withdraw'} />
      </View>
    );
  } else if (p.relation === 'connected') {
    bar = (
      <ButtonRow>
        {p.chatId ? <Button title="Message" variant="outline" icon="chatbubble-ellipses-outline" onPress={() => navigation.navigate('ChatThread', { chatId: p.chatId })} /> : null}
        {p.connectionId ? <Button title="Continue Journey" arrow onPress={() => navigation.navigate('Journey', { connectionId: p.connectionId })} /> : null}
      </ButtonRow>
    );
  }
  const menu = (
    <ActionMenu actions={[
      { label: p.bookmarked ? 'Remove bookmark' : 'Bookmark', icon: p.bookmarked ? 'bookmark' : 'bookmark-outline', onPress: () => run('bm', () => People.bookmark(p.id, !p.bookmarked), p.bookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks') },
      { label: 'Report', icon: 'flag-outline', onPress: () => navigation.navigate('ReportFlow', { userId: p.id, name: p.name }) },
      { label: 'Block', icon: 'ban-outline', danger: true, onPress: () => block.ask(p.id, p.name) },
    ]} />
  );
  return { bar, menu, dialog: block.dialog };
}

export default function PersonProfile({ route, navigation }: any) {
  const userId = route.params?.userId;
  const { data, error, loading, reload } = useLoad(() => People.get(userId), [userId]);
  const { bar, menu, dialog } = usePersonActions(data, reload, navigation);
  const { wide } = useLayout();
  const aside = data ? (
    <Card>
      <Txt variant="section">Take the next step</Txt>
      <Txt variant="body" style={{ marginVertical: 8 }}>{data.relation === 'connected' ? 'Continue your Setu journey together at your own pace.' : 'If you feel there is a potential match, express your interest and start a meaningful conversation.'}</Txt>
      {bar}
    </Card>
  ) : null;
  return (
    <Screen title={data ? nameAge(data) : 'Profile'} variant="center" back="Main" maxWidth={720} aside={aside}
      headerRight={menu} footer={!wide && data ? bar : undefined}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState title="This profile is not available" message={error} onRetry={reload} /> : data ? (
        <View style={{ paddingBottom: space.lg }}>
          <ProfileDetail p={data} tab={route.params?.tab} />
        </View>
      ) : null}
      {dialog}
    </Screen>
  );
}

