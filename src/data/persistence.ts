export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const MOCK_STORAGE_KEY = 'billkit.mock.v1';
export const ACTIVE_ORG_KEY = 'billkit.activeOrg';
export const THEME_KEY = 'billkit.theme';
export const CACHE_PREFIX = 'billkit.cache.v1:';

export async function readCache<T>(storage: KeyValueStore, key: string): Promise<T | null> {
  try {
    const raw = await storage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCache<T>(storage: KeyValueStore, key: string, value: T): Promise<void> {
  await storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
}
