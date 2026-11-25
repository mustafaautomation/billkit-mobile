import type { KeyValueStore } from './persistence';

export type QuerySnapshot<T> = {
  data: T | null;
  error: string | null;
  fromCache: boolean;
};

export async function resolveCachedQuery<T>(options: {
  storage: KeyValueStore;
  cacheKey: string;
  offline: boolean;
  read: (storage: KeyValueStore, key: string) => Promise<T | null>;
  write: (storage: KeyValueStore, key: string, value: T) => Promise<void>;
  fetcher: () => Promise<T>;
}): Promise<QuerySnapshot<T>> {
  const cached = await options.read(options.storage, options.cacheKey);
  if (options.offline) {
    if (!cached) {
      return {
        data: null,
        error: 'You are offline and this view is not saved on this device yet.',
        fromCache: false,
      };
    }
    return { data: cached, error: null, fromCache: true };
  }
  try {
    const fresh = await options.fetcher();
    await options.write(options.storage, options.cacheKey, fresh);
    return { data: fresh, error: null, fromCache: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    if (cached) return { data: cached, error: message, fromCache: true };
    return { data: null, error: message, fromCache: false };
  }
}
