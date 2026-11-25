export type LocalAlert = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function configureNotifications(): Promise<void> {}

export async function registerPushToken(): Promise<string | null> {
  if (typeof Notification === 'undefined') return 'web-preview-inbox';
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  return 'web-notification';
}

export async function presentLocalAlert(alert: LocalAlert): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification(alert.title, { body: alert.body });
}
