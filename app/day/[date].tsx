import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDailyActivity } from '../../src/db/dailyActivityRepo';
import { listEntriesByDate } from '../../src/db/entryRepo';
import { DailySummary, summarizeDay } from '../../src/domain/calories';
import { DEFAULT_ACTIVITY_FACTOR, Entry } from '../../src/domain/types';
import { formatTime, weekdayLabel } from '../../src/lib/date';
import { colors, radius, spacing } from '../../src/lib/theme';
import { useAppStore } from '../../src/store/useAppStore';

function sourceLabel(s: Entry['source']): string {
  if (s === 'ai') return 'AI 估算';
  if (s === 'thirdparty') return '第三方';
  return '手动';
}

export default function DayDetailScreen() {
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const profile = useAppStore((s) => s.profile);

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!date) return;
      const list = await listEntriesByDate(date);
      const factor = (await getDailyActivity(date)) ?? DEFAULT_ACTIVITY_FACTOR;
      if (!active) return;
      setEntries(list);
      setSummary(profile ? summarizeDay(list, profile, factor) : null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [date, profile]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: date ? `${date} ${weekdayLabel(date)}` : '日详情' }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          ListHeaderComponent={summary ? <DaySummary summary={summary} /> : null}
          ListEmptyComponent={<Text style={styles.empty}>这一天没有记录</Text>}
          renderItem={({ item }) => (
            <View style={styles.entryRow}>
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
            </View>
          )}
        />
      )}
    </View>
  );
}

function DaySummary({ summary }: { summary: DailySummary }) {
  const gaining = summary.weightDeltaKg >= 0;
  return (
    <View style={styles.card}>
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
      <Text style={styles.weightHint}>
        理论体重变化 {gaining ? '+' : '−'}
        {Math.abs(summary.weightDeltaKg).toFixed(3)} kg
        {summary.overThreshold ? ' · 当日摄入超标' : ''}
      </Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  weightHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
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
});
