import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

export type LocalAlert = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPushToken(): Promise<string | null> {
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Invoice payments',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const projectId =
    Constants.expoConfig?.extra &&
    typeof Constants.expoConfig.extra === 'object' &&
    'eas' in Constants.expoConfig.extra &&
    Constants.expoConfig.extra.eas &&
    typeof Constants.expoConfig.extra.eas === 'object' &&
    'projectId' in Constants.expoConfig.extra.eas
      ? String(Constants.expoConfig.extra.eas.projectId)
      : Constants.easConfig?.projectId;
  if (!projectId) return 'local-only';
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return 'local-only';
  }
}

export async function presentLocalAlert(alert: LocalAlert): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.body,
      data: alert.data ?? {},
    },
    trigger: null,
  });
}
