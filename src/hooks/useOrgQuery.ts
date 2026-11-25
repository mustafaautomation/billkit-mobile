import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCache, writeCache } from '../data/persistence';
import { resolveCachedQuery } from '../data/queryCache';
import { useApp } from '../state/useApp';

type QueryState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  fromCache: boolean;
  refresh: () => Promise<void>;
};

export function useOrgQuery<T>(name: string, fetcher: () => Promise<T>, deps: readonly unknown[] = []): QueryState<T> {
  const { offline, activeMembership, revision } = useApp();
  const organizationId = activeMembership?.organizationId ?? 'none';
  const dependencyKey = JSON.stringify([organizationId, name, offline, revision, deps]);
  const [state, setState] = useState<Omit<QueryState<T>, 'refresh'>>({
    data: null,
    error: null,
    loading: true,
    fromCache: false,
  });

  const refresh = useCallback(async () => {
    const result = await resolveCachedQuery<T>({
      storage: AsyncStorage,
      cacheKey: `${organizationId}:${name}`,
      offline,
      read: readCache,
      write: writeCache,
      fetcher,
    });
    setState({ data: result.data, error: result.error, loading: false, fromCache: result.fromCache });
  }, [fetcher, name, offline, organizationId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await resolveCachedQuery<T>({
        storage: AsyncStorage,
        cacheKey: `${organizationId}:${name}`,
        offline,
        read: readCache,
        write: writeCache,
        fetcher,
      });
      if (!cancelled) {
        setState({ data: result.data, error: result.error, loading: false, fromCache: result.fromCache });
      }
    })();
    return () => {
      cancelled = true;
    };
    // dependencyKey captures the caller-supplied deps without spreading them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencyKey]);

  return { ...state, refresh };
}
