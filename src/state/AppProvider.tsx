import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getRepository } from '../data/createRepository';
import { ACTIVE_ORG_KEY } from '../data/persistence';
import type { BillkitRepository } from '../data/repository';
import type { Membership, RepoEvent, Session } from '../domain/types';
import { configureNotifications, presentLocalAlert, registerPushToken } from '../notifications/push';

type AppValue = {
  ready: boolean;
  repo: BillkitRepository;
  session: Session | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  setActiveOrganization: (organizationId: string) => void;
  offline: boolean;
  forcedOffline: boolean;
  setForcedOffline: (offline: boolean) => void;
  revision: number;
  toast: string | null;
  dismissToast: () => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<string | null>;
  completeAuthCallback: (url: string) => Promise<void>;
  enterDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  resetDemo: () => Promise<void>;
};

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: BillkitRepository;
}) {
  const repo = useMemo(() => repository ?? getRepository(), [repository]);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [netOffline, setNetOffline] = useState(false);
  const [forcedOffline, setForcedOffline] = useState(false);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const refreshIdentity = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession) {
        setSession(null);
        setMemberships([]);
        setActiveOrgId(null);
        return;
      }
      const nextMemberships = await repo.listMemberships();
      const saved = await AsyncStorage.getItem(ACTIVE_ORG_KEY);
      const active =
        nextMemberships.find((item) => item.organizationId === saved)?.organizationId ??
        nextMemberships.find((item) => item.role === 'owner')?.organizationId ??
        nextMemberships[0]?.organizationId ??
        null;
      setSession(nextSession);
      setMemberships(nextMemberships);
      setActiveOrgId(active);
      if (active) await AsyncStorage.setItem(ACTIVE_ORG_KEY, active);
    },
    [repo],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await repo.ready();
      await configureNotifications();
      const current = await repo.getSession();
      if (cancelled) return;
      await refreshIdentity(current);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, refreshIdentity]);

  useEffect(() => {
    return repo.subscribe((event: RepoEvent) => {
      setRevision((value) => value + 1);
      if (event.type === 'invoice.paid') {
        setToast(event.message);
        void presentLocalAlert({
          title: 'Invoice paid',
          body: event.message,
          data: { invoiceId: event.invoiceId },
        });
      }
    });
  }, [repo]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const token = await registerPushToken();
      if (!token) return;
      await repo.registerPushToken({ token, platform: Platform.OS });
    })();
  }, [repo, session]);

  const setActiveOrganization = useCallback((organizationId: string) => {
    setActiveOrgId(organizationId);
    void AsyncStorage.setItem(ACTIVE_ORG_KEY, organizationId);
    setRevision((value) => value + 1);
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      ready,
      repo,
      session,
      memberships,
      activeMembership: memberships.find((item) => item.organizationId === activeOrgId) ?? null,
      setActiveOrganization,
      offline: forcedOffline || netOffline,
      forcedOffline,
      setForcedOffline,
      revision,
      toast,
      dismissToast: () => setToast(null),
      async signInWithPassword(email, password) {
        await refreshIdentity(await repo.signInWithPassword(email, password));
      },
      async requestMagicLink(email) {
        const result = await repo.requestMagicLink(email);
        return result.previewToken;
      },
      async completeAuthCallback(url) {
        await refreshIdentity(await repo.completeAuthCallback(url));
      },
      async enterDemo() {
        await refreshIdentity(await repo.enterDemo());
      },
      async signOut() {
        await repo.signOut();
        await AsyncStorage.removeItem(ACTIVE_ORG_KEY);
        await refreshIdentity(null);
      },
      async resetDemo() {
        await repo.resetDemo();
        await refreshIdentity(await repo.getSession());
        setRevision((item) => item + 1);
      },
    }),
    [
      ready,
      repo,
      session,
      memberships,
      activeOrgId,
      setActiveOrganization,
      forcedOffline,
      netOffline,
      revision,
      toast,
      refreshIdentity,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}
