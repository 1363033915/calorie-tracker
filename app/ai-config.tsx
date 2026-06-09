import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { listAIConfigs, upsertAIConfig } from '../src/db/aiConfigRepo';
import { AIProtocol } from '../src/domain/types';
import { uid } from '../src/lib/id';
import { colors, radius, spacing } from '../src/lib/theme';

const PRESETS: Record<AIProtocol, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6' },
};

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path;
}

/** 调用 GET /models 获取可用模型列表 */
async function fetchModelList(
  protocol: AIProtocol,
  baseUrl: string,
  key: string
): Promise<string[]> {
  if (protocol === 'anthropic') {
    const resp = await fetch(joinUrl(baseUrl, '/v1/models'), {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const list =
      data?.data ??
      data?.models ??
      data ??
      [];
    return (Array.isArray(list) ? list : []).map((m: any) => m.id ?? m.name ?? String(m)).filter(Boolean);
  }

  // OpenAI 协议 & 兼容网关
  const resp = await fetch(joinUrl(baseUrl, '/models'), {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  const list = data?.data ?? data?.models ?? [];
  return (Array.isArray(list) ? list : [])
    .map((m: any) => m.id ?? m.name ?? String(m))
    .filter(Boolean)
    .sort();
}

export default function AIConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);

  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<AIProtocol>('openai');
  const [baseUrl, setBaseUrl] = useState(PRESETS.openai.baseUrl);
  const [model, setModel] = useState(PRESETS.openai.model);
  const [apiKey, setApiKey] = useState('');

  // 模型列表拉取
  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelListError, setModelListError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const cfg = (await listAIConfigs()).find((c) => c.id === id);
      if (cfg) {
        setName(cfg.name);
        setProtocol(cfg.protocol);
        setBaseUrl(cfg.baseUrl);
        setModel(cfg.model);
      }
    })();
  }, [id]);

  const switchProtocol = (p: AIProtocol) => {
    setProtocol(p);
    if (!editing) {
      setBaseUrl(PRESETS[p].baseUrl);
      setModel(PRESETS[p].model);
    }
    setModelList([]);
    setModelListError('');
  };

  const handleFetchModels = async () => {
    const key = apiKey.trim();
    if (!key) {
      Alert.alert('提示', '请先填写 API Key');
      return;
    }
    if (!baseUrl.trim()) {
      Alert.alert('提示', '请先填写 Base URL');
      return;
    }
    setFetchingModels(true);
    setModelListError('');
    setModelList([]);
    try {
      const list = await fetchModelList(protocol, baseUrl.trim(), key);
      if (list.length === 0) {
        setModelListError('该接口未返回模型列表，请手动输入');
      } else {
        setModelList(list);
      }
    } catch (e: any) {
      setModelListError(`获取失败: ${e?.message ?? '未知错误'}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const save = async () => {
    if (!name.trim() || !baseUrl.trim() || !model.trim()) {
      Alert.alert('提示', '请填写名称、Base URL 和模型名');
      return;
    }
    if (!editing && !apiKey.trim()) {
      Alert.alert('提示', '请填写 API Key');
      return;
    }
    const existing = await listAIConfigs();
    const configId = id ?? uid();
    const makeActive = existing.length === 0 || existing.find((c) => c.id === configId)?.isActive;
    await upsertAIConfig(
      {
        id: configId,
        name: name.trim(),
        protocol,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        isActive: Boolean(makeActive),
      },
      apiKey.trim() || null
    );
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
        <Text style={styles.label}>协议风格</Text>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segBtn, protocol === 'openai' && styles.segActive]}
            onPress={() => switchProtocol('openai')}
          >
            <Text style={[styles.segText, protocol === 'openai' && styles.segTextActive]}>
              OpenAI 风格
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, protocol === 'anthropic' && styles.segActive]}
            onPress={() => switchProtocol('anthropic')}
          >
            <Text style={[styles.segText, protocol === 'anthropic' && styles.segTextActive]}>
              Anthropic 风格
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>配置名称</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例如：OpenAI 官方 / 通义千问 / 自建网关"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Base URL</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={(t) => {
            setBaseUrl(t);
            setModelList([]);
            setModelListError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={PRESETS[protocol].baseUrl}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>
          {protocol === 'openai'
            ? '请求将发往 {BaseURL}/chat/completions'
            : '请求将发往 {BaseURL}/v1/messages'}
        </Text>

        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder={editing ? '留空则保持原 Key 不变' : 'sk-...'}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>API Key 仅加密保存在本机（Secure Store），不会上传</Text>

        {/* -------- 模型名 + 获取列表 -------- */}
        <View style={styles.modelHeader}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>模型名</Text>
          <Pressable style={styles.fetchBtn} onPress={handleFetchModels} disabled={fetchingModels}>
            {fetchingModels ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={16} color={colors.primary} />
                <Text style={styles.fetchBtnText}>获取模型列表</Text>
              </>
            )}
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={PRESETS[protocol].model}
          placeholderTextColor={colors.textMuted}
        />

        {modelListError ? (
          <Text style={styles.errorText}>{modelListError}</Text>
        ) : null}

        {modelList.length > 0 && (
          <View style={styles.modelListCard}>
            <Text style={styles.modelListTitle}>
              可用模型（{modelList.length} 个，点击选择）
            </Text>
            <FlatList
              data={modelList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modelItem, item === model && styles.modelItemSelected]}
                  onPress={() => setModel(item)}
                >
                  <Ionicons
                    name={item === model ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={item === model ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[styles.modelItemText, item === model && styles.modelItemTextSelected]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <Text style={styles.hint}>建议使用支持图片识别（vision）的模型以便拍照估算</Text>

        <Pressable style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>{editing ? '保存修改' : '添加配置'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segActive: { backgroundColor: colors.card },
  segText: { fontSize: 14, color: colors.textMuted },
  segTextActive: { color: colors.text, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  fetchBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  modelListCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 220,
  },
  modelListTitle: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 6,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  modelItemSelected: { backgroundColor: '#E8F2EF' },
  modelItemText: { fontSize: 14, color: colors.text, flex: 1 },
  modelItemTextSelected: { color: colors.primary, fontWeight: '600' },
  errorText: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
});
