import { parseAuthParams } from './authUrl';
import { resolveCachedQuery } from './queryCache';
import type { KeyValueStore } from './persistence';
import { createMockRepository } from './mockRepository';
import { DEMO_PASSWORD, TEST_CARD } from '../domain/types';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump: () => Record<string, string> } {
  const data = { ...initial };
  return {
    async getItem(key) {
      return data[key] ?? null;
    },
    async setItem(key, value) {
      data[key] = value;
    },
    async removeItem(key) {
      delete data[key];
    },
    dump: () => data,
  };
}

describe('auth urls', () => {
  it('reads tokens from the query and the hash', () => {
    expect(parseAuthParams('billkit://auth/callback?token=magic_user_maya')).toEqual({ token: 'magic_user_maya' });
    expect(parseAuthParams('https://billkit-app.quvantic.com/auth/callback#access_token=abc&refresh_token=def')).toEqual({
      access_token: 'abc',
      refresh_token: 'def',
    });
  });
});

describe('query cache', () => {
  it('returns the saved copy while offline and refreshes while online', async () => {
    const storage = memoryStore();
    const offline = await resolveCachedQuery({
      storage,
      cacheKey: 'org:dashboard',
      offline: true,
      read: async (store, key) => JSON.parse((await store.getItem(key)) ?? 'null'),
      write: async (store, key, value) => {
        await store.setItem(key, JSON.stringify(value));
      },
      fetcher: async () => ({ total: 1 }),
    });
    expect(offline.error).toMatch(/offline/i);

    const online = await resolveCachedQuery({
      storage,
      cacheKey: 'org:dashboard',
      offline: false,
      read: async (store, key) => {
        const raw = await store.getItem(`billkit.cache.v1:${key}`);
        return raw ? (JSON.parse(raw) as { total: number }) : null;
      },
      write: async () => undefined,
      fetcher: async () => ({ total: 2 }),
    });
    expect(online.data).toEqual({ total: 2 });
  });
});

describe('mock repository', () => {
  it('signs in, switches roles, and blocks a viewer from sending', async () => {
    const repo = createMockRepository();
    await expect(repo.signInWithPassword('maya@northwind.studio', 'wrong')).rejects.toThrow(/do not match/);
    const session = await repo.signInWithPassword('sam@northwind.studio', DEMO_PASSWORD);
    expect(session.fullName).toBe('Sam Okonkwo');
    await expect(repo.getDashboard('org_northwind')).rejects.toThrow(/dashboard/);
    await expect(repo.sendReminder('org_northwind', 'inv_1042')).rejects.toThrow(/role/);
    const invoices = await repo.listInvoices('org_northwind', 'overdue', 'lumen');
    expect(invoices.map((invoice) => invoice.number)).toEqual(['INV-1042']);
  });

  it('creates, sends, reminds, and pays an invoice', async () => {
    const storage = memoryStore();
    const repo = createMockRepository({ storage });
    await repo.enterDemo();
    const created = await repo.createInvoice('org_northwind', {
      customerId: 'cus_atlas',
      dueDate: '2026-12-20',
      taxRatePercent: 8.5,
      notes: 'Rush cut',
      lines: [{ description: 'Edit', quantity: 2, unitAmountCents: 50000 }],
    });
    expect(created.number).toBe('INV-1057');
    expect(created.totalCents).toBe(108500);
    const sent = await repo.sendInvoice('org_northwind', created.id);
    expect(sent.displayStatus).toBe('sent');
    const reminded = await repo.sendReminder('org_northwind', created.id);
    expect(reminded.events.at(-1)?.message).toBe('Reminder queued for billing@atlasgoods.com');
    await expect(repo.paySharedInvoice(sent.publicToken, '4000000000000002')).rejects.toThrow(/declined/);
    const paid = await repo.paySharedInvoice(sent.publicToken, ` ${TEST_CARD} `);
    expect(paid.amountCents).toBe(108500);
    const shared = await repo.getSharedInvoice(sent.publicToken);
    expect(shared.displayStatus).toBe('paid');
    const alerts = await repo.listNotifications('org_northwind');
    expect(alerts[0]?.title).toBe('Invoice paid');

    const restored = createMockRepository({ storage });
    await restored.ready();
    const again = await restored.getSharedInvoice(sent.publicToken);
    expect(again.displayStatus).toBe('paid');
  });

  it('opens a magic link for a known teammate only', async () => {
    const repo = createMockRepository();
    const link = await repo.requestMagicLink('Jordan@northwind.studio');
    expect(link.previewToken).toBe('magic_user_jordan');
    const session = await repo.completeAuthCallback(`billkit://auth/callback?token=${link.previewToken}`);
    expect(session.email).toBe('jordan@northwind.studio');
    const memberships = await repo.listMemberships();
    expect(memberships).toHaveLength(1);
    await expect(repo.requestMagicLink('nobody@example.com')).rejects.toThrow(/workspace/);
  });

  it('lets a member save a draft but not send it', async () => {
    const repo = createMockRepository();
    await repo.signInWithPassword('nia@northwind.studio', DEMO_PASSWORD);
    const draft = await repo.createInvoice('org_northwind', {
      customerId: 'cus_paper',
      dueDate: '2026-12-01',
      taxRatePercent: 0,
      notes: '',
      lines: [{ description: 'Sketch', quantity: 1, unitAmountCents: 10000 }],
    });
    await expect(repo.sendInvoice('org_northwind', draft.id)).rejects.toThrow(/role/);
  });
});
