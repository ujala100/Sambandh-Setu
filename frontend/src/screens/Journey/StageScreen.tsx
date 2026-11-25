import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { completeStage } from '../../services/journeyApi';
import { STAGES, STAGE_LABELS, StageKey } from '../../services/mockData';
import { REMINDERS, STAGE_PAGE, SUGGESTIONS, TabKey } from '../../services/stageContent';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'guidance', label: 'Guidance' },
  { key: 'forYou', label: 'For You' },
  { key: 'activities', label: 'Activities' },
  { key: 'resources', label: 'Resources' },
];

const Figure = ({ body }: { body: string }) => (
  <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
    <View style={styles.head} />
    <View style={[styles.body, { backgroundColor: body }]} />
  </View>
);

export default function StageScreen({ navigation, route }: any) {
  const stage: StageKey = route.params.stage;
  const page = STAGE_PAGE[stage];
  const title = `Stage ${STAGES.indexOf(stage) + 1}: ${STAGE_LABELS[stage]}`;

  const [tab, setTab] = useState<TabKey>('guidance');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [note, setNote] = useState('');

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await completeStage(stage);
      navigation.navigate('Main');
    } catch {
      setError("Couldn't complete this stage. Try again.");
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        <Pressable onPress={() => setMenuOpen(!menuOpen)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="More options">
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </Pressable>
      </View>

      {menuOpen && (
        <Pressable
          style={[styles.menu, shadow.card]}
          onPress={() => {
            setMenuOpen(false);
            navigation.navigate('Guide');
          }}
          accessibilityRole="button"
          accessibilityLabel="Ask Setu Guide"
        >
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={styles.menuText}>Ask Setu Guide</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stage Header */}
        <View style={[styles.headerCard, shadow.card]}>
          <View style={styles.headerIcon}>
            <Ionicons name={page.icon as any} size={26} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerText}>{page.intro}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.tab, on && styles.tabOn]}
                onPress={() => { setTab(t.key); setNote(''); }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'guidance' && (
          <View style={[styles.meaning, shadow.card]}>
            <Text style={styles.meaningTitle}>What does this stage mean?</Text>
            <Text style={styles.meaningText}>{page.meaning}</Text>
            <View style={styles.illustration}>
              <View style={[styles.cloud, { left: 16, width: 54, height: 20 }]} />
              <View style={[styles.cloud, { right: 16, width: 60, height: 24 }]} />
              <Figure body={colors.primary} />
              <Figure body={colors.forest} />
            </View>
          </View>
        )}

        {/* Suggestions */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>{tab === 'guidance' ? 'Suggested for you' : TABS.find((t) => t.key === tab)!.label}</Text>
          <Text style={styles.seeAll} onPress={() => setNote('Full interactive activities coming soon.')}>See all →</Text>
        </View>
        {!!note && <Text style={styles.note}>{note}</Text>}

        {SUGGESTIONS[tab].map((item) => (
          <Pressable
            key={item.title}
            style={[styles.item, shadow.card]}
            onPress={() => setNote('This activity is available in your next check-in.')}
          >
            <View style={[styles.itemIcon, item.bg ? { backgroundColor: item.bg } : null]}>
              <Ionicons name={item.icon as any} size={18} color={item.tint ?? colors.primary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}

        {/* Helpful Reminders */}
        {tab === 'guidance' && (
          <View style={[styles.reminders, shadow.card]}>
            <View style={styles.row}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.remindersTitle}>Helpful Reminders</Text>
            </View>
            {REMINDERS.map((r) => (
              <View key={r} style={styles.reminder}>
                <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                <Text style={styles.reminderText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button
          title="Mark Stage Complete"
          arrow
          loading={busy}
          onPress={finish}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg, // Mint Green: #C0E1CF
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  menu: {
    position: 'absolute',
    top: 56,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 100,
    gap: 8,
  },
  menuText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 16.5,
    color: colors.text,
  },
  headerText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 2,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 3,
    marginVertical: spacing.md,
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
    fontSize: 12,
    color: colors.text,
  },
  tabTextOn: {
    fontFamily: fonts.semibold,
    color: '#fff',
  },

  meaning: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  meaningTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  meaningText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  illustration: {
    height: 84,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  cloud: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  head: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F2C9A5',
  },
  body: {
    width: 32,
    height: 40,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 2,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: colors.text,
  },
  seeAll: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  note: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    minHeight: 62,
    marginBottom: spacing.sm,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.text,
  },
  itemDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },

  reminders: {
    backgroundColor: colors.cardSecondary, // Sage Mint
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(77, 98, 87, 0.12)',
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  remindersTitle: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: 8,
  },
  reminderText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
