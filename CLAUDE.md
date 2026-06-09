@AGENTS.md

# 卡路里追踪 App

Expo + React Native（SDK 56, TypeScript, expo-router）纯本地卡路里追踪应用。无后端，数据与 API Key 都存手机本地。

## 运行

```bash
npm install          # 已配置 .npmrc: legacy-peer-deps=true（解决 Expo SDK 内部 peer 偏差）
npx expo start       # 扫码用 Expo Go 或 dev build 运行
```

Node 21 会有 EBADENGINE 警告，可忽略（功能正常）。

## 架构

- `app/` — expo-router 文件路由
  - `(tabs)/index.tsx` 今日首页（汇总/阈值进度/体重预测/记录列表/FAB）
  - `(tabs)/settings.tsx` 个人资料 + AI 配置列表 + 第三方开关
  - `add-entry.tsx` 添加记录（食物/运动，拍照或文字 → AI 估算 → 保存）
  - `ai-config.tsx` AI 厂商配置增改表单
- `src/domain/` — 纯计算逻辑
  - `calories.ts`：BMR(Mifflin-St Jeor)、`summarizeDay`、体重换算（7700 kcal/kg）
  - 净热量 = 摄入 −(BMR×活动系数 + 运动消耗)；运动单独记录，叠加在基础消耗之上避免重复计算
- `src/db/` — expo-sqlite（calorie.db）。表：profile / ai_configs / entries / settings。API Key 不入库，存 expo-secure-store
- `src/ai/` — 卡路里估算抽象层
  - `types.ts`：`CalorieEstimator` 接口（estimateFood/estimateExercise）
  - `aiEstimator.ts` + `providers/{openai,anthropic}.ts`：多厂商，OpenAI/Anthropic 协议
  - `thirdPartyEstimator.ts`：**开发者口子**，不用大模型时接第三方营养 API 的 stub
  - `registry.ts`：`resolveEstimator()` 根据「第三方开关」和激活的 AI 配置返回实现
- `src/store/useAppStore.ts` — Zustand，今日记录 + 汇总；摄入跨阈值时触发本地通知
- `src/lib/notify.ts` — expo-notifications（SDK 56 用 shouldShowBanner，非 shouldShowAlert）

## 关键约定

- 新增 SDK 用法务必查 https://docs.expo.dev/versions/v56.0.0/（API 与旧版差异大）
- image-picker：`mediaTypes: 'images'`（字符串），`base64: true` 取 base64 给 vision 模型
- 验证方式：`npx tsc --noEmit` + `npx expo export --platform ios`（无设备时验证整图可打包）+ `npx expo-doctor`
