import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveEstimator } from '../src/ai/registry';
import { EstimateResult } from '../src/ai/types';
import { EntryKind, EntrySource } from '../src/domain/types';
import { todayKey } from '../src/lib/date';
import { uid } from '../src/lib/id';
import { colors, radius, spacing } from '../src/lib/theme';
import { useAppStore } from '../src/store/useAppStore';

export default function AddEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addEntry = useAppStore((s) => s.addEntry);

  const [kind, setKind] = useState<EntryKind>('intake');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');

  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [caloriesInput, setCaloriesInput] = useState('');
  const [source, setSource] = useState<EntrySource>('manual');

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('权限被拒绝', fromCamera ? '无法使用相机' : '无法访问相册');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      quality: 0.5,
      base64: true,
    };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setImageUri(a.uri);
      setImageBase64(a.base64 ?? null);
      setImageMime(a.mimeType ?? 'image/jpeg');
    }
  };

  const runEstimate = async () => {
    if (kind === 'intake' && !description.trim() && !imageBase64) {
      Alert.alert('提示', '请拍照或输入食物描述');
      return;
    }
    if (kind === 'exercise' && !description.trim()) {
      Alert.alert('提示', '请描述你的运动');
      return;
    }
    setEstimating(true);
    setResult(null);
    try {
      const estimator = await resolveEstimator();
      const r =
        kind === 'intake'
          ? await estimator.estimateFood({
              text: description.trim() || undefined,
              imageBase64: imageBase64 ?? undefined,
              imageMime,
            })
          : await estimator.estimateExercise(description.trim());
      setResult(r);
      setCaloriesInput(String(r.calories));
      setSource(estimator.id === 'thirdparty' ? 'thirdparty' : 'ai');
      if (!description.trim() && r.items.length > 0) {
        setDescription(r.items.map((i) => i.name).join('、'));
      }
    } catch (e: any) {
      Alert.alert('估算失败', e?.message ?? '未知错误');
    } finally {
      setEstimating(false);
    }
  };

  const save = async () => {
    const cal = Math.round(Number(caloriesInput));
    if (!Number.isFinite(cal) || cal <= 0) {
      Alert.alert('提示', '请输入有效的卡路里数值');
      return;
    }
    if (!description.trim()) {
      Alert.alert('提示', '请填写描述');
      return;
    }
    await addEntry({
      id: uid(),
      date: todayKey(),
      kind,
      description: description.trim(),
      imageUri,
      calories: cal,
      source,
      items: result?.items ?? null,
      createdAt: Date.now(),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.segment}>
          <SegmentBtn
            active={kind === 'intake'}
            label="🍽 食物摄入"
            onPress={() => setKind('intake')}
          />
          <SegmentBtn
            active={kind === 'exercise'}
            label="🏃 运动消耗"
            onPress={() => setKind('exercise')}
          />
        </View>

        {kind === 'intake' && (
          <View style={styles.card}>
            <Text style={styles.label}>食物照片（可选）</Text>
            {imageUri ? (
              <View>
                <Image source={{ uri: imageUri }} style={styles.preview} />
                <Pressable
                  style={styles.removeImg}
                  onPress={() => {
                    setImageUri(null);
                    setImageBase64(null);
                  }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <Pressable style={styles.photoBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera" size={22} color={colors.primary} />
                  <Text style={styles.photoBtnText}>拍照</Text>
                </Pressable>
                <Pressable style={styles.photoBtn} onPress={() => pickImage(false)}>
                  <Ionicons name="images" size={22} color={colors.primary} />
                  <Text style={styles.photoBtnText}>相册</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>{kind === 'intake' ? '食物描述' : '运动描述'}</Text>
          <TextInput
            style={styles.textArea}
            placeholder={
              kind === 'intake'
                ? '例如：一碗牛肉面、两个鸡蛋、一杯奶茶'
                : '例如：慢跑 30 分钟、游泳 1 小时'
            }
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <Pressable style={styles.aiBtn} onPress={runEstimate} disabled={estimating}>
          {estimating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.aiBtnText}>AI 估算卡路里</Text>
            </>
          )}
        </Pressable>

        {result && (
          <View style={styles.card}>
            <Text style={styles.label}>估算结果</Text>
            {result.items.map((it, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemCal}>{it.calories} kcal</Text>
              </View>
            ))}
            {result.note ? <Text style={styles.note}>{result.note}</Text> : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>卡路里（kcal，可手动修改）</Text>
          <TextInput
            style={styles.calInput}
            keyboardType="numeric"
            value={caloriesInput}
            onChangeText={(t) => {
              setCaloriesInput(t);
              setSource('manual');
            }}
            placeholder="直接输入数值也可保存"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>保存到今日</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SegmentBtn({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segmentBtn, active && styles.segmentBtnActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  segmentTextActive: { color: colors.text, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm, fontWeight: '600' },
  photoRow: { flexDirection: 'row', gap: spacing.md },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  photoBtnText: { color: colors.primary, fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: radius.sm, resizeMode: 'cover' },
  removeImg: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 64,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  aiBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 14, color: colors.text, flex: 1 },
  itemCal: { fontSize: 14, color: colors.intake, fontWeight: '600' },
  note: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  calInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
