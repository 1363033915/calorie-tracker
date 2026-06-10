import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVITY_LEVELS, Entry } from '../../src/domain/types';
import { formatTime } from '../../src/lib/date';
import { colors, radius, spacing } from '../../src/lib/theme';
import { useAppStore } from '../../src/store/useAppStore';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const entries = useAppStore((s) => s.entries);
  const summary = useAppStore((s) => s.summary);
  const reloadEntries = useAppStore((s) => s.reloadEntries);
  const removeEntry = useAppStore((s) => s.removeEntry);

  useFocusEffect(
    useCallback(() => {
      reloadEntries();
    }, [reloadEntries])
  );

  const confirmDelete = (e: Entry) => {
    Alert.alert('删除记录', `确定删除「${e.description}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeEntry(e.id) },
    ]);
  };

  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>欢迎使用卡路里追踪</Text>
        <Text style={styles.emptyText}>请先完善个人资料，用于计算基础代谢与体重变化</Text>
        <Link href="/(tabs)/settings" asChild>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>去填写资料</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.header}>今日 · {useAppStore.getState().date}</Text>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96, paddingHorizontal: spacing.lg }}
        ListHeaderComponent={summary ? <SummaryCard /> : null}
        ListEmptyComponent={
          <Text style={styles.listEmpty}>今天还没有记录，点击右下角 + 添加</Text>
        }
        renderItem={({ item }) => (
          <Pressable onLongPress={() => confirmDelete(item)} style={styles.entryRow}>
            <View
              style={[
                styles.entryIcon,
                { backgroundColor: item.kind === 'intake' ? colors.intake : colors.exercise },
              ]}
            >
              <Ionicons
                name={item.kind === 'intake' ? 'restaurant' : 'walk'}
                size={18}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryDesc} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={styles.entryMeta}>
                {formatTime(item.createdAt)} · {sourceLabel(item.source)}
              </Text>
            </View>
            <Text
              style={[
                styles.entryCal,
                { color: item.kind === 'intake' ? colors.intake : colors.exercise },
              ]}
            >
              {item.kind === 'intake' ? '+' : '-'}
              {Math.round(item.calories)}
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push('/add-entry')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>
    </View>
  );
}

function sourceLabel(s: Entry['source']): string {
  if (s === 'ai') return 'AI 估算';
  if (s === 'thirdparty') return '第三方';
  return '手动';
}

function SummaryCard() {
  const summary = useAppStore((s) => s.summary);
  const profile = useAppStore((s) => s.profile);
  if (!summary || !profile) return null;

  const pct = Math.min(1, summary.intake / Math.max(1, profile.calorieThreshold));
  const over = summary.overThreshold;
  const deltaKg = summary.weightDeltaKg;
  const gaining = deltaKg >= 0;

  return (
    <View style={styles.summaryWrap}>
      <View style={[styles.card, over && styles.cardWarn]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>今日卡路里</Text>
          {over && (
            <View style={styles.warnBadge}>
              <Ionicons name="warning" size={14} color="#fff" />
              <Text style={styles.warnBadgeText}>超标</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat label="摄入" value={Math.round(summary.intake)} color={colors.intake} />
          <Stat label="消耗" value={Math.round(summary.totalBurn)} color={colors.exercise} />
          <Stat
            label="净热量"
            value={Math.round(summary.net)}
            color={summary.net > 0 ? colors.intake : colors.exercise}
            signed
          />
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : colors.primary },
            ]}
          />
        </View>
        <Text style={[styles.thresholdText, over && { color: colors.danger }]}>
          {over
            ? `已超出阈值 ${Math.round(-summary.thresholdRemaining)} kcal，建议运动消耗`
            : `距阈值还剩 ${Math.round(summary.thresholdRemaining)} kcal（阈值 ${profile.calorieThreshold}）`}
        </Text>
      </View>

      <ActivityCard />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>理论体重变化</Text>
        <Text style={[styles.weightValue, { color: gaining ? colors.intake : colors.exercise }]}>
          {gaining ? '+' : '−'}
          {Math.abs(deltaKg).toFixed(3)} kg
        </Text>
        <Text style={styles.weightHint}>
          基于净热量 {Math.round(summary.net)} kcal ÷ 7700（含基础代谢 {Math.round(summary.baselineBurn)} kcal）
        </Text>
      </View>
    </View>
  );
}

function ActivityCard() {
  const activityFactor = useAppStore((s) => s.activityFactor);
  const setActivityFactor = useAppStore((s) => s.setActivityFactor);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>今日活动量</Text>
      <Text style={styles.activityHint}>按今天的实际活动选择，影响基础消耗与体重推算</Text>
      <View style={styles.chipsWrap}>
        {ACTIVITY_LEVELS.map((lv) => {
          const active = activityFactor === lv.factor;
          return (
            <Pressable
              key={lv.factor}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActivityFactor(lv.factor)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{lv.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
  signed,
}: {
  label: string;
  value: number;
  color: string;
  signed?: boolean;
}) {
  const text = signed && value > 0 ? `+${value}` : `${value}`;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{text}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryWrap: { gap: spacing.md, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardWarn: { borderColor: colors.warnBorder, backgroundColor: colors.warnBg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  warnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  warnBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  thresholdText: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  weightValue: { fontSize: 28, fontWeight: '700' },
  weightHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  activityHint: { fontSize: 12, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E8F2EF' },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  listEmpty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDesc: { fontSize: 15, color: colors.text, fontWeight: '500' },
  entryMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  entryCal: { fontSize: 17, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
