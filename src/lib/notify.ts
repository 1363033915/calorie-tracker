import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** 超过摄入阈值时推送本地通知，提醒运动 */
export async function notifyOverThreshold(intake: number, threshold: number): Promise<void> {
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  const over = Math.round(intake - threshold);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ 卡路里超标了',
      body: `今日摄入 ${Math.round(intake)} kcal，已超出阈值 ${over} kcal，去运动消耗一下吧！`,
    },
    trigger: null,
  });
}
