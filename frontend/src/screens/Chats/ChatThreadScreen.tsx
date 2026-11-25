import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../../components/Avatar';
import { getMessages, sendMessage, markRead, Msg } from '../../services/chatApi';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

export default function ChatThreadScreen({ navigation, route }: any) {
  const { chatId, name = 'Match', photo, online = true } = route.params ?? {};
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<Msg>>(null);

  const photoUri = photo;

  const load = useCallback(async () => {
    try {
      const server = await getMessages(chatId);
      setMsgs((prev) => [...server, ...prev.filter((m) => m.status)]);
    } catch {
      // keep current msgs
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      load();
      markRead(chatId).catch(() => {});
      const t = setInterval(load, 4000);
      return () => clearInterval(t);
    }, [chatId, load])
  );

  const send = async (body: string, retryId?: string) => {
    const clean = body.trim();
    if (!clean) return;
    const tempId = retryId ?? `tmp${Date.now()}`;
    const timeNow = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const temp: Msg = { id: tempId, mine: true, text: clean, time: timeNow, status: 'sending' };
    setMsgs((prev) => (retryId ? prev.map((m) => (m.id === retryId ? temp : m)) : [...prev, temp]));
    if (!retryId) setText('');
    try {
      const saved = await sendMessage(chatId, clean);
      setMsgs((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch {
      setMsgs((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
    }
  };

  const openProfile = () => navigation.navigate('ChatProfile', { chatId });
  const openJourney = () => navigation.navigate('Main', { screen: 'Journey' });
  const openGuide = () => navigation.navigate('Guide');

  const renderItem = ({ item }: { item: Msg }) => {
    if (item.mine) {
      return (
        <View style={styles.rowMine}>
          <Pressable
            disabled={item.status !== 'failed'}
            onPress={() => send(item.text, item.id)}
            style={[styles.bubble, styles.bubbleMine, item.status === 'failed' && { opacity: 0.85 }]}
          >
            <Text style={styles.textMine}>{item.text}</Text>
            <View style={styles.meta}>
              {item.status === 'failed' ? (
                <>
                  <Ionicons name="alert-circle" size={13} color="#FECACA" />
                  <Text style={[styles.timeMine, { color: '#FECACA' }]}> Tap to retry</Text>
                </>
              ) : item.status === 'sending' ? (
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
              ) : (
                <>
                  <Text style={styles.timeMine}>{item.time} </Text>
                  <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.9)" />
                </>
              )}
            </View>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.rowTheirs}>
        <Avatar uri={photoUri} name={name} size={32} />
        <View style={[styles.bubble, styles.bubbleTheirs, shadow.card]}>
          <Text style={styles.textTheirs}>{item.text}</Text>
          <Text style={styles.timeTheirs}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <Pressable onPress={openProfile} style={styles.headerWho}>
          <Avatar uri={photoUri} name={name} size={40} online={online} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={styles.headerStatus}>{online ? 'Active now' : 'Offline'}</Text>
          </View>
        </Pressable>

        <Pressable hitSlop={8} onPress={openGuide} style={styles.headerIconBtn} accessibilityLabel="Ask AI Guide">
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </Pressable>
        <Pressable hitSlop={8} onPress={openProfile} style={styles.headerIconBtn} accessibilityLabel="More options">
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Setu Romantic Connection Banner */}
        <View style={[styles.banner, shadow.card]}>
          <View style={styles.bannerIcon}>
            <MaterialCommunityIcons name="infinity" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Connected on Sambandh Setu</Text>
            <Text style={styles.bannerSub}>Take your time to understand each other deeply.</Text>
          </View>
          <Pressable onPress={openJourney} style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>Journey</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} style={{ marginLeft: 3 }} />
          </Pressable>
        </View>

        {/* Messages List */}
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            msgs.length > 0 ? (
              <View style={styles.dateChip}>
                <Text style={styles.dateChipText}>Today</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="heart" size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Break the ice with {name}</Text>
                <Text style={styles.emptySubtitle}>
                  Say hello, share a compliment, or ask about something you both enjoy!
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* Bottom Composer */}
        <View style={styles.composer}>
          <Pressable style={styles.plusBtn} onPress={openGuide} accessibilityLabel="Ask Guide for advice">
            <Ionicons name="sparkles" size={18} color="#fff" />
          </Pressable>
          <View style={styles.inputWrap}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Message ${name.split(' ')[0]}...`}
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              maxLength={1000}
            />
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
          </View>
          <Pressable
            onPress={() => send(text)}
            disabled={!text.trim()}
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg, // Mint Green: #C0E1CF
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card, // Soft Cream: #FDF4F2
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerWho: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  headerStatus: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.success,
    marginTop: 1,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card, // Soft Cream
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  bannerSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  bannerBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.primary,
  },

  list: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  dateChip: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateChipText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  rowTheirs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  partnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  rowMine: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
    maxWidth: '100%',
  },
  bubbleTheirs: {
    backgroundColor: colors.card, // Soft Cream: #FDF4F2
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bubbleMine: {
    backgroundColor: colors.primary, // Rose Pink: #D06D94
    borderBottomRightRadius: 4,
    maxWidth: '82%',
  },
  textTheirs: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.text,
  },
  textMine: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 20,
    color: '#fff',
  },
  timeTheirs: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timeMine: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  plusBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    minHeight: 42,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
    marginRight: 6,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
