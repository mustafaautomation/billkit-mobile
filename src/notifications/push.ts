export type LocalAlert = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function configureNotifications(): Promise<void> {}

export async function registerPushToken(): Promise<string | null> {
  return 'web-preview-inbox';
}

export async function presentLocalAlert(_alert: LocalAlert): Promise<void> {}
