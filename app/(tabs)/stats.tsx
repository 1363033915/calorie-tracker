import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalorieBarChart } from '../../src/components/CalorieBarChart';
import { WeightLineChart } from '../../src/components/WeightLineChart';
import { DailyTotals, listDailyTotals } from '../../src/db/entryRepo';
import {
  buildDayStats,
  buildWeightSeries,
  DayStat,
  HISTORY_RANGES,
  sinceDateKey,
  WeightPoint,
} from '../../src/domain/history';
import { shortDate, weekdayLabel } from '../../src/lib/date';
import { colors, radius, spacing } from '../../src/lib/theme';
import { useAppStore } from '../../src/store/useAppStore';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profile = useAppStore((s) => s.profile);

  const [rangeIdx, setRangeIdx] = useState(1); // 默认 30 天
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DayStat[]>([]);
  const [weights, setWeights] = useState<WeightPoint[]>([]);

  const load = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const range = HISTORY_RANGES[rangeIdx];
    const since = range.days ? sinceDateKey(range.days) : undefined;
    const totals: DailyTotals[] = await listDailyTotals(since);
    const dayStats = buildDayStats(totals, profile);
    setStats(dayStats);
    setWeights(buildWeightSeries(dayStats, profile.weightKg));
    setLoading(false);
  }, [profile, rangeIdx]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="stats-chart-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>暂无统计</Text>
        <Text style={styles.emptyText}>请先在「设置」完善个人资料</Text>
      </View>
    );
  }

  const chartW = width - spacing.lg * 2 - spacing.lg * 2; // 屏宽 − 外边距 − 卡片内边距
  const hasData = stats.length > 0;

  // 汇总指标
  const totalIntake = stats.reduce((a, s) => a + s.intake, 0);
  const avgIntake = hasData ? Math.round(totalIntake / stats.length) : 0;
  const overDays = stats.filter((s) => s.overThreshold).length;
  const weightChange =
    weights.length >= 2 ? weights[weights.length - 1].weightKg - weights[0].weightKg : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <Text style={styles.title}>统计</Text>

      {/* 时间范围切换 */}
      <View style={styles.segment}>
        {HISTORY_RANGES.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={() => setRangeIdx(i)}
            style={[styles.segmentBtn, i === rangeIdx && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, i === rangeIdx && styles.segmentTextActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasData ? (
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>该时间段还没有记录</Text>
        </View>
      ) : (
        <>
          {/* 概览指标 */}
          <View style={styles.metricsRow}>
            <Metric label="平均摄入" value={`${avgIntake}`} unit="kcal/天" />
            <Metric label="超标天数" value={`${overDays}`} unit={`/ ${stats.length} 天`} />
            <Metric
              label="体重变化"
              value={`${weightChange >= 0 ? '+' : '−'}${Math.abs(weightChange).toFixed(2)}`}
              unit="kg"
              color={weightChange >= 0 ? colors.intake : colors.exercise}
            />
          </View>

          {/* 卡路里柱状图 */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>每日摄入卡路里</Text>
              <View style={styles.legendRow}>
                <Legend color={colors.intake} label="正常" />
                <Legend color={colors.danger} label="超标" />
              </View>
            </View>
            <CalorieBarChart
              data={stats.map((s) => ({ date: s.date, intake: s.intake, over: s.overThreshold }))}
              threshold={profile.calorieThreshold}
              width={chartW}
            />
          </View>

          {/* 体重曲线图 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>体重变化趋势</Text>
            <Text style={styles.cardSub}>
              以当前体重 {profile.weightKg} kg 为基准，按每日净热量理论推算
            </Text>
            <WeightLineChart data={weights} width={chartW} />
          </View>

          {/* 历史日期列表 */}
          <Text style={styles.sectionTitle}>历史记录</Text>
          <View style={styles.card}>
            {[...stats].reverse().map((s, i, arr) => (
              <Pressable
                key={s.date}
                style={[styles.dayRow, i < arr.length - 1 && styles.dayRowDivider]}
                onPress={() => router.push(`/day/${s.date}`)}
              >
                <View style={styles.dayLeft}>
                  <Text style={styles.dayDate}>{shortDate(s.date)}</Text>
                  <Text style={styles.dayWeekday}>{weekdayLabel(s.date)}</Text>
                </View>
                <View style={styles.dayMid}>
                  <Text style={styles.dayIntake}>
                    摄入 <Text style={{ color: colors.intake }}>{Math.round(s.intake)}</Text>
                    {s.exercise > 0 && (
                      <Text style={styles.dayExercise}> · 运动 {Math.round(s.exercise)}</Text>
                    )}
                  </Text>
                  <Text
                    style={[
                      styles.dayNet,
                      { color: s.net >= 0 ? colors.intake : colors.exercise },
                    ]}
                  >
                    净 {s.net >= 0 ? '+' : '−'}
                    {Math.abs(Math.round(s.net))} kcal
                  </Text>
                </View>
                {s.overThreshold && (
                  <Ionicons name="warning" size={16} color={colors.danger} style={{ marginRight: 4 }} />
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
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
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentBtnActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  segmentTextActive: { color: colors.text, fontWeight: '700' },
  loadingBox: { paddingVertical: spacing.xl * 2, alignItems: 'center' },
  metricsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  metric: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  metricUnit: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  legendRow: { flexDirection: 'row', gap: spacing.md },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  dayRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dayLeft: { width: 52 },
  dayDate: { fontSize: 15, fontWeight: '600', color: colors.text },
  dayWeekday: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  dayMid: { flex: 1, paddingLeft: spacing.sm },
  dayIntake: { fontSize: 13, color: colors.text },
  dayExercise: { fontSize: 13, color: colors.textMuted },
  dayNet: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
