import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deleteAIConfig,
  listAIConfigs,
  setActiveAIConfig,
} from '../../src/db/aiConfigRepo';
import { getUseThirdParty, setUseThirdParty } from '../../src/db/settingsRepo';
import { calcBMR, calcBaselineBurn } from '../../src/domain/calories';
import { ACTIVITY_LEVELS, AIConfig, Gender, UserProfile } from '../../src/domain/types';
import { colors, radius, spacing } from '../../src/lib/theme';
import { useAppStore } from '../../src/store/useAppStore';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'male');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [heightCm, setHeightCm] = useState(String(profile?.heightCm ?? ''));
  const [weightKg, setWeightKg] = useState(String(profile?.weightKg ?? ''));
  const [activityFactor, setActivityFactor] = useState(profile?.activityFactor ?? 1.375);
  const [threshold, setThreshold] = useState(String(profile?.calorieThreshold ?? 2000));

  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [useThird, setUseThird] = useState(false);

  const reload = useCallback(async () => {
    setConfigs(await listAIConfigs());
    setUseThird(await getUseThirdParty());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    if (profile) {
      setGender(profile.gender);
      setAge(String(profile.age));
      setHeightCm(String(profile.heightCm));
      setWeightKg(String(profile.weightKg));
      setActivityFactor(profile.activityFactor);
      setThreshold(String(profile.calorieThreshold));
    }
  }, [profile]);

  const previewProfile: UserProfile | null = (() => {
    const a = Number(age);
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!a || !h || !w) return null;
    return {
      gender,
      age: a,
      heightCm: h,
      weightKg: w,
      activityFactor,
      calorieThreshold: Number(threshold) || 0,
    };
  })();

  const saveProfile = async () => {
    const a = Number(age);
    const h = Number(heightCm);
    const w = Number(weightKg);
    const t = Number(threshold);
    if (!a || !h || !w || !t) {
      Alert.alert('提示', '请完整填写年龄、身高、体重、阈值');
      return;
    }
    await updateProfile({
      gender,
      age: a,
      heightCm: h,
      weightKg: w,
      activityFactor,
      calorieThreshold: t,
    });
    Alert.alert('已保存', '个人资料已更新');
  };

  const toggleThird = async (v: boolean) => {
    setUseThird(v);
    await setUseThirdParty(v);
  };

  const activate = async (id: string) => {
    await setActiveAIConfig(id);
    reload();
  };

  const removeConfig = (cfg: AIConfig) => {
    Alert.alert('删除配置', `确定删除「${cfg.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteAIConfig(cfg.id);
          reload();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <Text style={styles.pageTitle}>设置</Text>

      {/* 个人资料 */}
      <Text style={styles.sectionTitle}>个人资料</Text>
      <View style={styles.card}>
        <Text style={styles.label}>性别</Text>
        <View style={styles.genderRow}>
          <Pressable
            style={[styles.genderBtn, gender === 'male' && styles.genderActive]}
            onPress={() => setGender('male')}
          >
            <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>男</Text>
          </Pressable>
          <Pressable
            style={[styles.genderBtn, gender === 'female' && styles.genderActive]}
            onPress={() => setGender('female')}
          >
            <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>女</Text>
          </Pressable>
        </View>

        <Field label="年龄（岁）" value={age} onChange={setAge} />
        <Field label="身高（cm）" value={heightCm} onChange={setHeightCm} />
        <Field label="体重（kg）" value={weightKg} onChange={setWeightKg} />

        <Text style={styles.label}>日常活动量（不含刻意运动）</Text>
        <View style={styles.chipsWrap}>
          {ACTIVITY_LEVELS.map((lv) => (
            <Pressable
              key={lv.factor}
              style={[styles.chip, activityFactor === lv.factor && styles.chipActive]}
              onPress={() => setActivityFactor(lv.factor)}
            >
              <Text
                style={[styles.chipText, activityFactor === lv.factor && styles.chipTextActive]}
              >
                {lv.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field label="每日摄入阈值（kcal）" value={threshold} onChange={setThreshold} />

        {previewProfile && (
          <View style={styles.bmrBox}>
            <Text style={styles.bmrText}>
              基础代谢 BMR：{Math.round(calcBMR(previewProfile))} kcal/天
            </Text>
            <Text style={styles.bmrText}>
              每日基础消耗（含活动系数）：{Math.round(calcBaselineBurn(previewProfile))} kcal/天
            </Text>
          </View>
        )}

        <Pressable style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveBtnText}>保存资料</Text>
        </Pressable>
      </View>

      {/* AI 配置 */}
      <Text style={styles.sectionTitle}>卡路里估算来源</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>使用第三方接口</Text>
            <Text style={styles.switchHint}>
              开启后不调用大模型，改用开发者在代码中接入的第三方营养 API
            </Text>
          </View>
          <Switch value={useThird} onValueChange={toggleThird} />
        </View>
      </View>

      <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
        <Text style={styles.sectionTitle}>AI 厂商配置</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/ai-config')}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>添加</Text>
        </Pressable>
      </View>

      {configs.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            还没有 AI 配置。点击右上角「添加」，填入厂商的 Base URL、模型名和 API Key。
            支持任意兼容 OpenAI / Anthropic 协议的国内外厂商。
          </Text>
        </View>
      ) : (
        configs.map((cfg) => (
          <View key={cfg.id} style={styles.configRow}>
            <Pressable style={styles.configMain} onPress={() => activate(cfg.id)}>
              <Ionicons
                name={cfg.isActive ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={cfg.isActive ? colors.primary : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.configName}>{cfg.name}</Text>
                <Text style={styles.configMeta}>
                  {cfg.protocol === 'openai' ? 'OpenAI 协议' : 'Anthropic 协议'} · {cfg.model}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/ai-config', params: { id: cfg.id } })}
              style={styles.iconBtn}
            >
              <Ionicons name="create-outline" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => removeConfig(cfg)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.textMuted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  genderRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderActive: { borderColor: colors.primary, backgroundColor: '#E8F2EF' },
  genderText: { fontSize: 15, color: colors.textMuted },
  genderTextActive: { color: colors.primary, fontWeight: '700' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
  bmrBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  bmrText: { fontSize: 13, color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  switchHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addBtnText: { color: colors.primary, fontWeight: '600' },
  emptyText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  configMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  configName: { fontSize: 15, color: colors.text, fontWeight: '600' },
  configMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  iconBtn: { padding: spacing.sm },
});
