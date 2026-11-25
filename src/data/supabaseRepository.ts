import * as Linking from 'expo-linking';
import type { SupabaseClient } from '@supabase/supabase-js';
import { localIsoDate } from '../domain/dates';
import { buildDashboard } from '../domain/dashboard';
import { canCreateInvoice, canManageCustomers, canSendInvoice, canViewDashboard, compareRoles } from '../domain/permissions';
import { displayStatus, matchesFilter } from '../domain/status';
import type {
  CheckoutSession,
  CustomerInput,
  InvoiceDetail,
  InvoiceFilter,
  InvoiceInput,
  InvoiceSummary,
  LineItem,
  Membership,
  Organization,
  PaymentResult,
  PushRegistration,
  RepoEvent,
  Role,
  Session,
  SharedInvoice,
  StoredInvoiceStatus,
  TeamMember,
} from '../domain/types';
import { parseAuthParams } from './authUrl';
import { BillkitError } from './errors';
import type { BillkitRepository } from './repository';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  tax_label: string;
  default_tax_rate: number;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
};

type InvoiceRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  number: string;
  status: StoredInvoiceStatus;
  issue_date: string;
  due_date: string;
  currency: string;
  tax_rate: number;
  notes: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  public_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  updated_at: string;
  customers?: { id: string; name: string; email: string; company: string } | { id: string; name: string; email: string; company: string }[] | null;
};

function asRole(value: string): Role {
  if (value === 'owner' || value === 'admin' || value === 'accountant' || value === 'member' || value === 'viewer') {
    return value;
  }
  return 'viewer';
}

function fail(message: string, code: 'network' | 'not_found' | 'permission' | 'auth' = 'network'): never {
  throw new BillkitError(message, code);
}

function mapOrg(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    currency: row.currency,
    taxLabel: row.tax_label,
    defaultTaxRatePercent: Number(row.default_tax_rate),
    email: row.email,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
  };
}

function embeddedCustomer(row: InvoiceRow['customers']): { id: string; name: string; email: string; company: string } | null {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

export function createSupabaseRepository(client: SupabaseClient): BillkitRepository {
  const listeners = new Set<(event: RepoEvent) => void>();

  function emit(event: RepoEvent): void {
    for (const listener of listeners) listener(event);
  }

  async function currentUserId(): Promise<string> {
    const { data, error } = await client.auth.getSession();
    if (error) fail(error.message, 'auth');
    const userId = data.session?.user.id;
    if (!userId) fail('Sign in to continue.', 'auth');
    return userId;
  }

  async function currentSession(): Promise<Session | null> {
    const { data, error } = await client.auth.getSession();
    if (error) fail(error.message, 'auth');
    const user = data.session?.user;
    if (!user?.email) return null;
    const profile = await client.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const fullName = typeof profile.data?.full_name === 'string' && profile.data.full_name
      ? profile.data.full_name
      : user.email;
    return { userId: user.id, email: user.email, fullName, mode: 'supabase' };
  }

  async function roleFor(organizationId: string): Promise<Role> {
    const userId = await currentUserId();
    const { data, error } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) fail(error.message);
    if (!data?.role) fail('You do not belong to this workspace.', 'permission');
    return asRole(String(data.role));
  }

  async function requireRole(organizationId: string, check: (role: Role) => boolean, message: string): Promise<Role> {
    const role = await roleFor(organizationId);
    if (!check(role)) fail(message, 'permission');
    return role;
  }

  function toSummary(row: InvoiceRow, paid: number, asOf: string): InvoiceSummary {
    const person = embeddedCustomer(row.customers);
    const balance = Math.max(row.total_cents - paid, 0);
    return {
      id: row.id,
      number: row.number,
      customerName: person?.name ?? 'Customer',
      displayStatus: displayStatus(row.status, row.due_date, asOf, balance),
      totalCents: row.total_cents,
      balanceCents: balance,
      currency: row.currency,
      dueDate: row.due_date,
      issueDate: row.issue_date,
    };
  }

  async function paidByInvoice(organizationId: string): Promise<Map<string, number>> {
    const { data, error } = await client
      .from('payments')
      .select('invoice_id, amount_cents')
      .eq('organization_id', organizationId);
    if (error) fail(error.message);
    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      const invoiceId = String(row.invoice_id);
      totals.set(invoiceId, (totals.get(invoiceId) ?? 0) + Number(row.amount_cents));
    }
    return totals;
  }

  async function loadDetail(organizationId: string, invoiceId: string): Promise<InvoiceDetail> {
    const asOf = localIsoDate();
    const invoiceResult = await client
      .from('invoices')
      .select('*, customers(id, name, email, company)')
      .eq('organization_id', organizationId)
      .eq('id', invoiceId)
      .maybeSingle();
    if (invoiceResult.error) fail(invoiceResult.error.message);
    if (!invoiceResult.data) fail('That invoice is not in this workspace.', 'not_found');
    const row = invoiceResult.data as InvoiceRow;
    const paid = (await paidByInvoice(organizationId)).get(row.id) ?? 0;
    const linesResult = await client
      .from('invoice_line_items')
      .select('id, description, quantity, unit_amount_cents, sort_order')
      .eq('invoice_id', invoiceId)
      .order('sort_order');
    if (linesResult.error) fail(linesResult.error.message);
    const eventsResult = await client
      .from('invoice_events')
      .select('id, type, message, created_at')
      .eq('invoice_id', invoiceId)
      .order('created_at');
    if (eventsResult.error) fail(eventsResult.error.message);
    const person = embeddedCustomer(row.customers);
    const summary = toSummary(row, paid, asOf);
    const lines: LineItem[] = (linesResult.data ?? []).map((line) => ({
      id: String(line.id),
      description: String(line.description),
      quantity: Number(line.quantity),
      unitAmountCents: Number(line.unit_amount_cents),
      amountCents: Math.round(Number(line.quantity) * Number(line.unit_amount_cents)),
    }));
    return {
      ...summary,
      organizationId,
      customer: {
        id: person?.id ?? row.customer_id,
        organizationId,
        name: person?.name ?? summary.customerName,
        email: person?.email ?? '',
        company: person?.company ?? '',
      },
      status: row.status,
      taxRatePercent: Number(row.tax_rate),
      notes: row.notes ?? '',
      lines,
      subtotalCents: row.subtotal_cents,
      taxCents: row.tax_cents,
      paidCents: row.total_cents - summary.balanceCents,
      publicToken: row.public_token,
      sentAt: row.sent_at,
      viewedAt: row.viewed_at,
      paidAt: row.paid_at,
      events: (eventsResult.data ?? []).map((event) => ({
        id: String(event.id),
        type: event.type,
        message: String(event.message),
        createdAt: String(event.created_at),
      })),
    };
  }

  return {
    mode: 'supabase',
    async ready() {
      return Promise.resolve();
    },
    subscribe(listener) {
      listeners.add(listener);
      const channel = client
        .channel('billkit-invoices')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoices' }, () => {
          emit({ type: 'changed' });
        })
        .subscribe();
      return () => {
        listeners.delete(listener);
        void client.removeChannel(channel);
      };
    },
    today: () => localIsoDate(),
    async signInWithPassword(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) fail(error.message, 'auth');
      const session = await currentSession();
      if (!session) fail('Sign-in did not finish.', 'auth');
      emit({ type: 'changed' });
      return session;
    },
    async requestMagicLink(email) {
      const redirect = Linking.createURL('auth/callback');
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (error) fail(error.message, 'auth');
      return { email: email.trim(), previewToken: null };
    },
    async completeMagicLink() {
      fail('Open the magic link from your email to finish signing in.', 'auth');
    },
    async completeAuthCallback(url) {
      const params = parseAuthParams(url);
      if (params.error_description || params.error) {
        fail(params.error_description || 'The sign-in link was rejected.', 'auth');
      }
      if (!params.access_token || !params.refresh_token) {
        fail('This sign-in link is missing its token.', 'auth');
      }
      const { error } = await client.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) fail(error.message, 'auth');
      const session = await currentSession();
      if (!session) fail('Sign-in did not finish.', 'auth');
      emit({ type: 'changed' });
      return session;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) fail(error.message, 'auth');
      emit({ type: 'changed' });
    },
    getSession: () => currentSession(),
    async enterDemo() {
      fail('Demo mode is available when Supabase keys are not configured.', 'auth');
    },
    async resetDemo() {
      fail('Demo data can only be reset in mock mode.', 'auth');
    },
    async listMemberships() {
      const userId = await currentUserId();
      const { data, error } = await client
        .from('organization_members')
        .select('role, organizations(id, name, currency)')
        .eq('user_id', userId);
      if (error) fail(error.message);
      const memberships: Membership[] = [];
      for (const row of data ?? []) {
        const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
        if (!org) continue;
        memberships.push({
          organizationId: String(org.id),
          organizationName: String(org.name),
          role: asRole(String(row.role)),
          currency: String(org.currency),
        });
      }
      return memberships.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
    },
    async getOrganization(organizationId) {
      await roleFor(organizationId);
      const { data, error } = await client.from('organizations').select('*').eq('id', organizationId).maybeSingle();
      if (error) fail(error.message);
      if (!data) fail('That workspace could not be found.', 'not_found');
      return mapOrg(data as OrgRow);
    },
    async listTeam(organizationId) {
      await roleFor(organizationId);
      const { data, error } = await client
        .from('organization_members')
        .select('role, user_id, profiles(full_name, email)')
        .eq('organization_id', organizationId);
      if (error) fail(error.message);
      const team: TeamMember[] = (data ?? []).map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          userId: String(row.user_id),
          fullName: String(profile?.full_name ?? 'Teammate'),
          email: String(profile?.email ?? ''),
          role: asRole(String(row.role)),
        };
      });
      return team.sort((a, b) => compareRoles(a.role, b.role) || a.fullName.localeCompare(b.fullName));
    },
    async getDashboard(organizationId) {
      await requireRole(organizationId, canViewDashboard, 'Your role does not include the revenue dashboard.');
      const org = await client.from('organizations').select('currency').eq('id', organizationId).maybeSingle();
      if (org.error) fail(org.error.message);
      const asOf = localIsoDate();
      const invoices = await client
        .from('invoices')
        .select('id, number, customer_id, status, issue_date, due_date, currency, total_cents, updated_at')
        .eq('organization_id', organizationId);
      if (invoices.error) fail(invoices.error.message);
      const payments = await client
        .from('payments')
        .select('amount_cents, created_at')
        .eq('organization_id', organizationId);
      if (payments.error) fail(payments.error.message);
      const customers = await client.from('customers').select('id, name, email, company, organization_id').eq('organization_id', organizationId);
      if (customers.error) fail(customers.error.message);
      const paid = await paidByInvoice(organizationId);
      return buildDashboard({
        currency: String(org.data?.currency ?? 'USD'),
        asOf,
        customers: (customers.data ?? []).map((row) => ({
          id: String(row.id),
          organizationId,
          name: String(row.name),
          email: String(row.email),
          company: String(row.company ?? ''),
        })),
        payments: (payments.data ?? []).map((row) => ({
          amountCents: Number(row.amount_cents),
          createdAt: String(row.created_at),
        })),
        invoices: (invoices.data ?? []).map((row) => ({
          id: String(row.id),
          number: String(row.number),
          customerId: String(row.customer_id),
          status: row.status as StoredInvoiceStatus,
          issueDate: String(row.issue_date),
          dueDate: String(row.due_date),
          currency: String(row.currency),
          totalCents: Number(row.total_cents),
          paidCents: paid.get(String(row.id)) ?? 0,
          updatedAt: String(row.updated_at),
        })),
      });
    },
    async listCustomers(organizationId) {
      const role = await roleFor(organizationId);
      if (role === 'viewer') fail('Viewers cannot open the customer list.', 'permission');
      const { data, error } = await client
        .from('customers')
        .select('id, organization_id, name, email, company')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) fail(error.message);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        name: String(row.name),
        email: String(row.email),
        company: String(row.company ?? ''),
      }));
    },
    async createCustomer(organizationId, input: CustomerInput) {
      await requireRole(organizationId, canManageCustomers, 'Your role cannot add customers.');
      const { data, error } = await client
        .from('customers')
        .insert({
          organization_id: organizationId,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          company: input.company.trim(),
        })
        .select('id, organization_id, name, email, company')
        .single();
      if (error) fail(error.message);
      emit({ type: 'changed' });
      return {
        id: String(data.id),
        organizationId: String(data.organization_id),
        name: String(data.name),
        email: String(data.email),
        company: String(data.company ?? ''),
      };
    },
    async listInvoices(organizationId, filter: InvoiceFilter, query: string) {
      await roleFor(organizationId);
      const asOf = localIsoDate();
      const { data, error } = await client
        .from('invoices')
        .select('*, customers(id, name, email, company)')
        .eq('organization_id', organizationId);
      if (error) fail(error.message);
      const paid = await paidByInvoice(organizationId);
      const needle = query.trim().toLowerCase();
      return (data ?? [])
        .map((item) => item as InvoiceRow)
        .map((row) => ({ row, summary: toSummary(row, paid.get(row.id) ?? 0, asOf) }))
        .filter(({ row, summary }) => matchesFilter(summary, row.status, filter))
        .filter(({ row, summary }) => {
          if (!needle) return true;
          const person = embeddedCustomer(row.customers);
          return (
            summary.number.toLowerCase().includes(needle) ||
            summary.customerName.toLowerCase().includes(needle) ||
            (person?.email.toLowerCase().includes(needle) ?? false)
          );
        })
        .sort((a, b) => b.row.issue_date.localeCompare(a.row.issue_date))
        .map(({ summary }) => summary);
    },
    async getInvoice(organizationId, invoiceId) {
      await roleFor(organizationId);
      return loadDetail(organizationId, invoiceId);
    },
    async createInvoice(organizationId, input: InvoiceInput) {
      const userId = await currentUserId();
      await requireRole(organizationId, canCreateInvoice, 'Your role cannot create invoices.');
      const org = await client.from('organizations').select('currency').eq('id', organizationId).maybeSingle();
      if (org.error || !org.data) fail(org.error?.message ?? 'That workspace could not be found.');
      const { priceLines } = await import('../domain/invoiceMath');
      const priced = priceLines(input.lines, input.taxRatePercent);
      const inserted = await client
        .from('invoices')
        .insert({
          organization_id: organizationId,
          customer_id: input.customerId,
          status: 'draft',
          issue_date: localIsoDate(),
          due_date: input.dueDate,
          currency: org.data.currency,
          tax_rate: input.taxRatePercent,
          notes: input.notes.trim(),
          subtotal_cents: priced.subtotalCents,
          tax_cents: priced.taxCents,
          total_cents: priced.totalCents,
          created_by: userId,
        })
        .select('id')
        .single();
      if (inserted.error || !inserted.data) fail(inserted.error?.message ?? 'The invoice could not be saved.');
      const invoiceId = String(inserted.data.id);
      const lines = await client.from('invoice_line_items').insert(
        input.lines.map((line, index) => ({
          invoice_id: invoiceId,
          organization_id: organizationId,
          description: line.description.trim(),
          quantity: line.quantity,
          unit_amount_cents: line.unitAmountCents,
          sort_order: index,
        })),
      );
      if (lines.error) fail(lines.error.message);
      const event = await client.from('invoice_events').insert({
        invoice_id: invoiceId,
        organization_id: organizationId,
        type: 'created',
        message: 'Draft created',
      });
      if (event.error) fail(event.error.message);
      emit({ type: 'changed' });
      return loadDetail(organizationId, invoiceId);
    },
    async sendInvoice(organizationId, invoiceId) {
      const userId = await currentUserId();
      await requireRole(organizationId, canSendInvoice, 'Your role cannot send invoices.');
      const existing = await loadDetail(organizationId, invoiceId);
      if (existing.status !== 'draft') fail('This invoice was already sent.', 'network');
      const stamp = new Date().toISOString();
      const update = await client
        .from('invoices')
        .update({ status: 'sent', sent_at: stamp, updated_at: stamp })
        .eq('id', invoiceId)
        .eq('organization_id', organizationId);
      if (update.error) fail(update.error.message);
      const event = await client.from('invoice_events').insert({
        invoice_id: invoiceId,
        organization_id: organizationId,
        type: 'sent',
        message: `Sent to ${existing.customer.email}`,
        actor_id: userId,
      });
      if (event.error) fail(event.error.message);
      emit({ type: 'changed' });
      return loadDetail(organizationId, invoiceId);
    },
    async sendReminder(organizationId, invoiceId) {
      const userId = await currentUserId();
      await requireRole(organizationId, canSendInvoice, 'Your role cannot send reminders.');
      const existing = await loadDetail(organizationId, invoiceId);
      if (existing.status === 'draft') fail('Send the invoice before reminding the customer.', 'network');
      if (existing.balanceCents <= 0) fail('This invoice is already paid.', 'network');
      const event = await client.from('invoice_events').insert({
        invoice_id: invoiceId,
        organization_id: organizationId,
        type: 'reminder',
        message: `Reminder queued for ${existing.customer.email}`,
        actor_id: userId,
      });
      if (event.error) fail(event.error.message);
      emit({ type: 'changed' });
      return loadDetail(organizationId, invoiceId);
    },
    async getSharedInvoice(token) {
      const { data, error } = await client.functions.invoke('shared-invoice', { body: { token } });
      if (error) fail(error.message);
      if (!data) fail('This invoice link is not valid.', 'not_found');
      return data as SharedInvoice;
    },
    async paySharedInvoice(): Promise<PaymentResult> {
      fail('Pay this invoice through Stripe Checkout.', 'network');
    },
    async createCheckout(token): Promise<CheckoutSession> {
      const { data, error } = await client.functions.invoke('create-invoice-checkout', { body: { token } });
      if (error) fail(error.message);
      const url = typeof data?.url === 'string' ? data.url : '';
      if (!url) fail('Stripe did not return a checkout link.');
      return { mode: 'stripe', url };
    },
    async listNotifications(organizationId) {
      const userId = await currentUserId();
      const { data, error } = await client
        .from('notifications')
        .select('id, organization_id, title, body, invoice_id, read_at, created_at')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) fail(error.message);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        organizationId: String(row.organization_id),
        title: String(row.title),
        body: String(row.body),
        invoiceId: row.invoice_id ? String(row.invoice_id) : null,
        readAt: row.read_at ? String(row.read_at) : null,
        createdAt: String(row.created_at),
      }));
    },
    async markNotificationRead(organizationId, notificationId) {
      const userId = await currentUserId();
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      if (error) fail(error.message);
      emit({ type: 'changed' });
    },
    async markAllNotificationsRead(organizationId) {
      const userId = await currentUserId();
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) fail(error.message);
      emit({ type: 'changed' });
    },
    async registerPushToken(input: PushRegistration) {
      const userId = await currentUserId();
      await client.from('push_tokens').delete().eq('user_id', userId);
      const { error } = await client.from('push_tokens').insert({
        user_id: userId,
        token: input.token,
        platform: input.platform,
      });
      if (error) fail(error.message);
    },
    async getPushRegistration() {
      const userId = await currentUserId();
      const { data, error } = await client
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) fail(error.message);
      if (!data) return null;
      return { token: String(data.token), platform: String(data.platform) };
    },
  };
}
