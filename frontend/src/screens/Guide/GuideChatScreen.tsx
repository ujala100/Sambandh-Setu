import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getActive } from '../../services/api';
import { askGuide, Intent, QUICK_ACTIONS } from '../../services/chatApi';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const ICONS: Record<Intent, string> = {
  conversation_ideas: 'chatbubbles-outline',
  help_me_understand: 'book-outline',
  next_steps: 'sparkles-outline',
  privacy_safety: 'shield-checkmark-outline',
};
const VISIBLE_QUESTIONS = 5;

type GMsg = {
  id: string;
  mine: boolean;
  kind?: 'greeting';
  text?: string;
  time: string;
  questions?: string[];
  topic?: string;
  safety?: string | null;
  chips?: string[];
};

const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const greeting = (matchName: string = 'your match'): GMsg => ({
  id: 'm0',
  mine: false,
  kind: 'greeting',
  time: clock(),
  text: `Hi! I'm Setu Guide 👋\nI'm your relationship and compatibility companion. I'm here to support you with conversation ideas, dating advice, and helpful insights as you get to know ${matchName} better.`,
});

// Robust extractor preventing React child object crashes
const extractString = (val: any): string => {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    return val.question || val.text || val.title || val.prompt || val.label || '';
  }
  return val != null ? String(val) : '';
};

export default function GuideChatScreen({ navigation, route }: any) {
  const [matchName, setMatchName] = useState('your match');
  const [connectionId, setConnectionId] = useState<string | undefined>();
  const [msgs, setMsgs] = useState<GMsg[]>([greeting()]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState('');
  const [note, setNote] = useState('');
  const scroll = useRef<any>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialIntentRef = useRef(false);

  useEffect(() => {
    getActive()
      .then((a) => {
        const conn = a[0];
        if (conn) {
          setMatchName(conn.name);
          setConnectionId(conn.id);
          setMsgs((prev) => {
            if (prev.length === 1 && prev[0].kind === 'greeting') {
              return [greeting(conn.name)];
            }
            return prev;
          });
          const initIntent = route?.params?.intent;
          if (initIntent && !initialIntentRef.current) {
            initialIntentRef.current = true;
            send({ intent: initIntent }, conn.id);
          }
        }
      })
      .catch(() => {});
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const flash = (m: string) => {
    setNote(m);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 2200);
  };

  const add = (m: GMsg) => setMsgs((prev) => [...prev, m]);

  const send = async (p: { intent?: Intent; text?: string }, overrideConnId?: string) => {
    if (typing) return;
    const shown = p.text ?? QUICK_ACTIONS.find((q) => q.intent === p.intent)?.label ?? '';
    add({ id: `u${Date.now()}`, mine: true, text: shown, time: clock() });
    setText('');
    setTyping(true);

    try {
      const activeConnId = overrideConnId || connectionId;
      const r = await askGuide({ connectionId: activeConnId, intent: p.intent, message: p.text });
      setTyping(false);

      const safetyNote =
        typeof r.safety === 'string'
          ? r.safety
          : r.safety && typeof r.safety === 'object' && (r.safety as any).status && (r.safety as any).status !== 'pass'
          ? `Safety status: ${(r.safety as any).status}`
          : null;

      const replyString =
        typeof r.reply === 'string'
          ? r.reply
          : r.reply && typeof r.reply === 'object'
          ? (r.reply as any).text || (r.reply as any).message || String(r.reply)
          : String(r.reply || '');

      const parsedQuestions = Array.isArray(r.questions)
        ? r.questions.map(extractString).filter((q) => q.trim().length > 0)
        : [];

      const parsedChips = Array.isArray(r.chips)
        ? r.chips.map(extractString).filter((c) => c.trim().length > 0)
        : [];

      add({
        id: `b${Date.now()}`,
        mine: false,
        text: replyString,
        time: clock(),
        questions: parsedQuestions,
        topic: typeof r.topic === 'string' ? r.topic : undefined,
        chips: parsedChips,
        safety: safetyNote,
      });
    } catch (err) {
      setTyping(false);
      add({
        id: `b${Date.now()}`,
        mine: false,
        text: "I'm right here with you! Let me share a few helpful perspectives on building mutual comfort and understanding at your own pace.",
        time: clock(),
        chips: ['Conversation starters', 'Shared values', 'Next steps'],
      });
    }
  };

  const onChip = (label: string) => {
    const quick = QUICK_ACTIONS.find((q) => q.label.toLowerCase() === label.toLowerCase());
    quick ? send({ intent: quick.intent }) : send({ text: label });
  };

  const copy = async (q: string) => {
    try {
      await Clipboard.setStringAsync(q);
      setCopied(q);
      flash('Question copied to clipboard');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      flash('Question copied!');
    }
  };

  const canSend = text.trim().length > 0 && !typing;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.botHeaderAvatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.title}>Setu Guide</Text>
            <View style={styles.onlineRow}>
              <View style={styles.greenDot} />
              <Text style={styles.onlineText}>AI Relationship Coach</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={() => setMenuOpen(!menuOpen)} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      {menuOpen && (
        <Pressable
          style={[styles.menu, shadow.card]}
          onPress={() => {
            setMenuOpen(false);
            setMsgs([greeting(matchName)]);
            setExpanded({});
          }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.menuText}>Clear conversation</Text>
        </Pressable>
      )}

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {msgs.map((m) => {
            const isOpen = !!expanded[m.id];
            const qs = m.questions ?? [];
            const visible = isOpen ? qs : qs.slice(0, VISIBLE_QUESTIONS);

            return (
              <View key={m.id} style={{ marginBottom: spacing.md }}>
                {m.mine ? (
                  <View style={styles.mineRow}>
                    <View style={[styles.mineBubble, shadow.card]}>
                      <Text style={styles.mineText}>{m.text}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.mineTime}>{m.time}</Text>
                        <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 4 }} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.botRow}>
                      <View style={styles.botAvatarCircle}>
                        <Ionicons name="sparkles" size={14} color="#fff" />
                      </View>
                      <View style={[styles.botBubble, shadow.card]}>
                        <Text style={styles.botText}>{m.text}</Text>
                        <Text style={styles.botTime}>{m.time}</Text>
                      </View>
                    </View>

                    {/* Quick actions for initial greeting */}
                    {m.kind === 'greeting' && (
                      <View style={[styles.helpCard, shadow.card]}>
                        <Text style={styles.helpTitle}>How can I help you today?</Text>
                        <View style={styles.helpGrid}>
                          {QUICK_ACTIONS.map((a) => (
                            <Pressable
                              key={a.intent}
                              style={styles.helpChip}
                              disabled={typing}
                              onPress={() => send({ intent: a.intent })}
                              accessibilityRole="button"
                            >
                              <Ionicons name={ICONS[a.intent] as any} size={15} color={colors.primary} />
                              <Text style={styles.helpChipText} numberOfLines={1}>{a.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Suggested questions list */}
                    {qs.length > 0 && (
                      <View style={[styles.suggestCard, shadow.card]}>
                        <View style={styles.suggestHead}>
                          <Ionicons name="chatbubbles" size={16} color={colors.primary} />
                          <Text style={styles.suggestTitle}>{m.topic ?? 'Curated Questions for You'}</Text>
                        </View>

                        {visible.map((q, idx) => {
                          const qStr = extractString(q);
                          if (!qStr) return null;
                          return (
                            <View key={`${idx}-${qStr.slice(0, 20)}`} style={styles.qRow}>
                              <Pressable style={styles.qMain} onPress={() => setText(qStr)}>
                                <Ionicons name="heart" size={10} color={colors.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                <Text style={styles.qText}>{qStr}</Text>
                              </Pressable>
                              <Pressable onPress={() => copy(qStr)} style={styles.copyBtn} hitSlop={6}>
                                <Ionicons
                                  name={copied === qStr ? 'checkmark-circle' : 'copy-outline'}
                                  size={16}
                                  color={copied === qStr ? colors.success : colors.muted}
                                />
                              </Pressable>
                            </View>
                          );
                        })}

                        {qs.length > VISIBLE_QUESTIONS && (
                          <Pressable
                            onPress={() => setExpanded((e) => ({ ...e, [m.id]: !isOpen }))}
                            style={styles.moreBtn}
                          >
                            <Text style={styles.moreText}>
                              {isOpen ? 'Show fewer' : `Show all ${qs.length} questions`} {isOpen ? '↑' : '↓'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {/* Follow-up chips */}
                    {!!m.chips?.length && (
                      <View style={styles.chipsRow}>
                        {m.chips.map((c, cIdx) => {
                          const cStr = extractString(c);
                          if (!cStr) return null;
                          return (
                            <Pressable
                              key={`${cIdx}-${cStr}`}
                              style={styles.actionChip}
                              disabled={typing}
                              onPress={() => onChip(cStr)}
                            >
                              <Text style={styles.actionChipText}>{cStr}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {typing && (
            <View style={styles.botRow}>
              <View style={styles.botAvatarCircle}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </View>
              <View style={[styles.botBubble, styles.typingBubble]}>
                <Text style={styles.typingText}>Setu Guide is thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {!!note && (
          <View style={styles.toastWrap}>
            <Text style={styles.toastText}>{note}</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.textInputWrap}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Ask Setu Guide for dating advice..."
              placeholderTextColor={colors.muted}
              style={styles.textInput}
              multiline
              maxLength={600}
            />
          </View>
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            disabled={!canSend}
            onPress={() => send({ text })}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
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
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  botHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.success,
  },

  menu: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  menuText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },

  scrollContent: {
    padding: spacing.md,
    paddingBottom: 24,
  },

  mineRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  mineBubble: {
    backgroundColor: colors.primary, // Rose Pink: #D06D94
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
  },
  mineText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  mineTime: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
  },

  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: spacing.sm,
    maxWidth: '92%',
  },
  botAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  botBubble: {
    backgroundColor: colors.card, // Soft Cream: #FDF4F2
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexShrink: 1,
  },
  botText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  botTime: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.muted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingBubble: {
    backgroundColor: colors.cardSecondary,
  },
  typingText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Greeting Quick Actions
  helpCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginLeft: 36,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  helpTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helpGrid: {
    gap: spacing.xs,
  },
  helpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardSecondary, // Sage Mint
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  helpChipText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.text,
  },

  // Suggested Questions
  suggestCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginLeft: 36,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  suggestHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  suggestTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(77, 98, 87, 0.06)',
  },
  qMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  qText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  copyBtn: {
    padding: 6,
  },
  moreBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  moreText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
    marginLeft: 36,
  },
  actionChip: {
    backgroundColor: colors.primarySoft, // Blush Pink: #FAC6D6
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  actionChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },

  toastWrap: {
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: 8,
  },
  toastText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    minHeight: 42,
    maxHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textInput: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.text,
    paddingVertical: 8,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
