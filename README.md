# 卡路里追踪

用 AI 拍照识别食物、记录每日摄入与运动消耗的 React Native 应用。纯本地运行，数据和 API Key 全部加密保存在手机。

## 快速开始

```bash
# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npx expo start
```

手机安装 **Expo Go**，扫描终端二维码即可体验。首次启动请先到「设置」填写个人资料和 AI 厂商配置。

## 功能

- **拍照估算** — 拍食物照片，AI 视觉模型识别并计算卡路里，生成逐项明细
- **文字记录** — 用文字描述吃过的食物或做过的运动，AI 自动估算
- **摄入阈值** — 设定每日摄入上限，超标时首页变红警告 + 推送本地通知
- **运动消耗** — 描述运动，AI 估算消耗卡路里
- **体重预测** — 基于净热量（摄入 − 基础代谢 − 运动消耗）推算理论体重增减（7700 kcal/kg）
- **多厂商 AI** — 支持 OpenAI / Anthropic 协议及所有兼容网关（通义千问、DeepSeek、硅基流动等），可配置多个随时切换
- **第三方口子** — 无需 AI 时，可接任意营养数据库 API，代码已预留扩展点
- **纯本地隐私** — SQLite 存记录，Secure Store 加密存 API Key，数据不上传

## 截图（结构概览）

```
┌── 今日 ────────────────────────────┐
│  2026-06-09                         │
│  ┌──────────────────────────────┐   │
│  │ 🔴 超标 今日卡路里             │   │
│  │ 摄入 +1,950  消耗 -2,300      │   │
│  │ 净热量 -350                    │   │
│  │ ████████░░░░ 97% / 2000       │   │
│  │ 距阈值还剩 50 kcal             │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 理论体重变化  −0.045 kg        │   │
│  └──────────────────────────────┘   │
│  ─ 早餐 牛肉面 +420  AI估算        │
│  ─ 午餐 宫保鸡丁饭 +680  AI估算    │
│  ─ 晚餐     +520  手动             │
│  ─ 有氧跑40分  −450  AI估算        │
│                        ┌────┐      │
│                        │  + │      │
│                        └────┘      │
└────────────────────────────────────┘
```

## 技术栈

| 层 | 方案 |
|----|------|
| 框架 | React Native + Expo SDK 56 + TypeScript |
| 路由 | expo-router（文件路由） |
| 数据库 | expo-sqlite（calorie.db） |
| 安全存储 | expo-secure-store（API Key 加密） |
| 照片 | expo-image-picker（相机 + 相册） |
| 通知 | expo-notifications（超阈值本地推送） |
| 状态 | Zustand |
| 打包 | EAS Build + GitHub Actions |

## 项目结构

```
app/                  # expo-router 页面
  (tabs)/
    index.tsx         # 今日首页（汇总/阈值/体重/记录列表）
    settings.tsx      # 个人资料 + AI配置 + 第三方开关
  add-entry.tsx       # 添加记录（拍照/文字 → AI估算）
  ai-config.tsx       # AI厂商配置表单
src/
  domain/             # 业务逻辑（BMR、净热量、体重换算）
  db/                 # SQLite 仓库（profile/entries/ai_configs/settings）
  ai/                 # AI 抽象层
    types.ts          # CalorieEstimator 接口
    aiEstimator.ts    # AI 实现
    providers/        # openai.ts / anthropic.ts 协议适配器
    thirdPartyEstimator.ts  # 第三方API 开发者口子（stub）
    registry.ts       # 估算器解析与调度
  store/              # Zustand 全局状态
  lib/                # 工具（日期/ID/通知/主题色）
```

## AI 估算层设计

所有估算都走统一接口，业务代码不感知后端：

```typescript
interface CalorieEstimator {
  estimateFood(input: { text?, imageBase64? }): Promise<EstimateResult>
  estimateExercise(description: string): Promise<EstimateResult>
}
```

- **AI 路径**：用户配置的厂商 → OpenAI/Anthropic 协议适配器 → 模型返回 JSON → 解析
- **第三方路径**：`src/ai/thirdPartyEstimator.ts` 中的 stub → 开发者填入自有 API 调用

设置页的「使用第三方接口」开关控制用哪条路径，`registry.ts` 负责分发。

## 打包安装

### 方式一：GitHub Actions 自动打包（推荐）

1. Fork 此仓库
2. 在 Expo 官网生成 Token：https://expo.dev/settings/access-tokens
3. 在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：
   - `EXPO_TOKEN`：上一步的 Token
4. 推送代码到 `main` 分支，或手动触发 Actions 中的 **Build Android APK**
5. 构建完成后，去 https://expo.dev 项目页面下载 APK
6. 传 APK 到手机，点击安装

### 方式二：本地命令行打包

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 APK（云端，不需装 Android 环境）
eas build --platform android --profile preview
```

构建完成后，Expo 会返回下载链接，或用二维码扫描下载。

### 配置说明

- `eas.json` 中 `preview` profile 配置为内部发布 + APK 格式
- `app.json` 中 `android.package` 设为 `com.promauser.calorietracker`，Fork 后请改为你自己的包名
- 如需修改应用名，改 `app.json` 中的 `name` 字段
