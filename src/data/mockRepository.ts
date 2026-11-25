import { atDemoTime, isIsoDate } from '../domain/dates';
import { buildDashboard } from '../domain/dashboard';
import { isEmail, normalizeCardNumber, priceLines } from '../domain/invoiceMath';
import { canCreateInvoice, canManageCustomers, canSendInvoice, canViewDashboard, compareRoles } from '../domain/permissions';
import { displayStatus, matchesFilter } from '../domain/status';
import type {
  AppNotification,
  CheckoutSession,
  Customer,
  CustomerInput,
  Dashboard,
  InvoiceDetail,
  InvoiceFilter,
  InvoiceInput,
  InvoiceSummary,
  LineItem,
  Membership,
  Organization,
  PaymentResult,
  RepoEvent,
  Role,
  Session,
  SharedInvoice,
  TeamMember,
} from '../domain/types';
import { DEMO_AS_OF, DEMO_OWNER_EMAIL, TEST_CARD } from '../domain/types';
import { parseAuthParams } from './authUrl';
import { BillkitError } from './errors';
import type { KeyValueStore } from './persistence';
import { MOCK_STORAGE_KEY } from './persistence';
import type { BillkitRepository } from './repository';
import {
  createSeed,
  type Database,
  type EventRow,
  type InvoiceRow,
  type MembershipRow,
  type UserRow,
} from './seed';

export type MockRepositoryOptions = {
  storage?: KeyValueStore;
  asOf?: string;
  initial?: Database;
};

export function createMockRepository(options: MockRepositoryOptions = {}): BillkitRepository {
  const asOf = options.asOf ?? DEMO_AS_OF;
  let db = options.initial ?? createSeed(asOf);
  const listeners = new Set<(event: RepoEvent) => void>();
  let readyPromise: Promise<void> | null = null;

  function emit(event: RepoEvent): void {
    for (const listener of listeners) listener(event);
  }

  async function persist(): Promise<void> {
    if (!options.storage) return;
    await options.storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
  }

  async function hydrate(): Promise<void> {
    if (!options.storage) return;
    const raw = await options.storage.getItem(MOCK_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Database;
      if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.invoices)) return;
      db = parsed;
    } catch {
      db = createSeed(asOf);
    }
  }

  function ready(): Promise<void> {
    if (!readyPromise) readyPromise = hydrate();
    return readyPromise;
  }

  function nowIso(): string {
    return atDemoTime(asOf);
  }

  function userById(userId: string): UserRow | undefined {
    return db.users.find((user) => user.id === userId);
  }

  function requireUser(): UserRow {
    const user = db.sessionUserId ? userById(db.sessionUserId) : undefined;
    if (!user) throw new BillkitError('Sign in to continue.', 'auth');
    return user;
  }

  function toSession(user: UserRow): Session {
    return { userId: user.id, email: user.email, fullName: user.fullName, mode: 'mock' };
  }

  function membership(organizationId: string, userId: string): MembershipRow | undefined {
    return db.memberships.find((item) => item.organizationId === organizationId && item.userId === userId);
  }

  function requireRole(organizationId: string, allowed?: Role[]): MembershipRow {
    const user = requireUser();
    const row = membership(organizationId, user.id);
    if (!row) throw new BillkitError('You do not belong to this workspace.', 'permission');
    if (allowed && !allowed.includes(row.role)) {
      throw new BillkitError('Your role cannot do that in this workspace.', 'permission');
    }
    return row;
  }

  function organization(organizationId: string): Organization {
    const org = db.organizations.find((item) => item.id === organizationId);
    if (!org) throw new BillkitError('That workspace could not be found.', 'not_found');
    return org;
  }

  function customer(customerId: string, organizationId: string): Customer {
    const row = db.customers.find((item) => item.id === customerId && item.organizationId === organizationId);
    if (!row) throw new BillkitError('Choose a customer from this workspace.', 'validation');
    return row;
  }

  function paidCents(invoiceId: string): number {
    return db.payments
      .filter((payment) => payment.invoiceId === invoiceId)
      .reduce((sum, payment) => sum + payment.amountCents, 0);
  }

  function lineItems(invoiceId: string): LineItem[] {
    return db.lines
      .filter((line) => line.invoiceId === invoiceId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitAmountCents: line.unitAmountCents,
        amountCents: Math.round(line.quantity * line.unitAmountCents),
      }));
  }

  function eventsFor(invoiceId: string): EventRow[] {
    return db.events
      .filter((event) => event.invoiceId === invoiceId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function summarize(invoice: InvoiceRow): InvoiceSummary {
    const person = db.customers.find((item) => item.id === invoice.customerId);
    const balance = Math.max(invoice.totalCents - paidCents(invoice.id), 0);
    return {
      id: invoice.id,
      number: invoice.number,
      customerName: person?.name ?? 'Customer',
      displayStatus: displayStatus(invoice.status, invoice.dueDate, asOf, balance),
      totalCents: invoice.totalCents,
      balanceCents: balance,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      issueDate: invoice.issueDate,
    };
  }

  function detail(invoice: InvoiceRow): InvoiceDetail {
    const person = customer(invoice.customerId, invoice.organizationId);
    const summary = summarize(invoice);
    return {
      ...summary,
      customerName: person.name,
      organizationId: invoice.organizationId,
      customer: person,
      status: invoice.status,
      taxRatePercent: invoice.taxRatePercent,
      notes: invoice.notes,
      lines: lineItems(invoice.id),
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      paidCents: invoice.totalCents - summary.balanceCents,
      publicToken: invoice.publicToken,
      sentAt: invoice.sentAt,
      viewedAt: invoice.viewedAt,
      paidAt: invoice.paidAt,
      events: eventsFor(invoice.id).map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
      })),
    };
  }

  function findInvoice(organizationId: string, invoiceId: string): InvoiceRow {
    const invoice = db.invoices.find((item) => item.id === invoiceId && item.organizationId === organizationId);
    if (!invoice) throw new BillkitError('That invoice is not in this workspace.', 'not_found');
    return invoice;
  }

  function findByToken(token: string): InvoiceRow {
    const invoice = db.invoices.find((item) => item.publicToken === token);
    if (!invoice || invoice.status === 'draft' || invoice.status === 'void') {
      throw new BillkitError('This invoice link is not valid.', 'not_found');
    }
    return invoice;
  }

  function validateInvoiceInput(input: InvoiceInput): void {
    if (!isIsoDate(input.dueDate)) throw new BillkitError('Choose a valid due date.', 'validation');
    if (input.taxRatePercent < 0 || input.taxRatePercent > 100) {
      throw new BillkitError('Tax must be between 0 and 100.', 'validation');
    }
    if (input.notes.length > 500) throw new BillkitError('Notes must be 500 characters or fewer.', 'validation');
    if (input.lines.length === 0) throw new BillkitError('Add at least one line item.', 'validation');
    for (const line of input.lines) {
      if (!line.description.trim()) throw new BillkitError('Each line needs a description.', 'validation');
      if (line.quantity <= 0) throw new BillkitError('Quantity must be greater than zero.', 'validation');
      if (line.unitAmountCents < 0) throw new BillkitError('Price cannot be negative.', 'validation');
    }
  }

  function notifyFinance(organizationId: string, title: string, body: string, invoiceId: string): void {
    const stamp = nowIso();
    for (const member of db.memberships) {
      if (member.organizationId !== organizationId) continue;
      if (!canSendInvoice(member.role)) continue;
      db.ids.notification += 1;
      db.notifications.push({
        id: `ntf_${db.ids.notification}`,
        organizationId,
        userId: member.userId,
        title,
        body,
        invoiceId,
        readAt: null,
        createdAt: stamp,
      });
    }
  }

  async function signInUser(user: UserRow): Promise<Session> {
    db.sessionUserId = user.id;
    await persist();
    emit({ type: 'changed' });
    return toSession(user);
  }

  const repository: BillkitRepository = {
    mode: 'mock',
    ready,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    today: () => asOf,
    async signInWithPassword(email, password) {
      await ready();
      const user = db.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) {
        throw new BillkitError('That email and password do not match.', 'auth');
      }
      return signInUser(user);
    },
    async requestMagicLink(email) {
      await ready();
      const trimmed = email.trim().toLowerCase();
      if (!isEmail(trimmed)) throw new BillkitError('Enter a valid email address.', 'validation');
      const user = db.users.find((item) => item.email === trimmed);
      if (!user) throw new BillkitError('No Billkit workspace uses that email.', 'auth');
      const token = `magic_${user.id}`;
      db.magicTokens = db.magicTokens.filter((item) => item.email !== trimmed);
      db.magicTokens.push({ token, email: trimmed });
      await persist();
      return { email: trimmed, previewToken: token };
    },
    async completeMagicLink(token) {
      await ready();
      const link = db.magicTokens.find((item) => item.token === token);
      if (!link) throw new BillkitError('This sign-in link has expired. Request a new one.', 'auth');
      const user = db.users.find((item) => item.email === link.email);
      if (!user) throw new BillkitError('No Billkit workspace uses that email.', 'auth');
      db.magicTokens = db.magicTokens.filter((item) => item.token !== token);
      return signInUser(user);
    },
    async completeAuthCallback(url) {
      const params = parseAuthParams(url);
      if (params.error_description || params.error) {
        throw new BillkitError(params.error_description || 'The sign-in link was rejected.', 'auth');
      }
      if (!params.token) throw new BillkitError('This sign-in link is missing its token.', 'auth');
      return repository.completeMagicLink(params.token);
    },
    async signOut() {
      await ready();
      db.sessionUserId = null;
      await persist();
      emit({ type: 'changed' });
    },
    async getSession() {
      await ready();
      const user = db.sessionUserId ? userById(db.sessionUserId) : undefined;
      return user ? toSession(user) : null;
    },
    async enterDemo() {
      await ready();
      const user = db.users.find((item) => item.email === DEMO_OWNER_EMAIL);
      if (!user) throw new BillkitError('The demo workspace is unavailable.', 'network');
      return signInUser(user);
    },
    async resetDemo() {
      await ready();
      const previous = db.sessionUserId ? userById(db.sessionUserId)?.email : null;
      db = createSeed(asOf);
      if (previous) {
        const user = db.users.find((item) => item.email === previous);
        if (user) db.sessionUserId = user.id;
      }
      await persist();
      emit({ type: 'changed' });
    },
    async listMemberships() {
      await ready();
      const user = requireUser();
      return db.memberships
        .filter((item) => item.userId === user.id)
        .map((item) => {
          const org = organization(item.organizationId);
          const membershipRow: Membership = {
            organizationId: org.id,
            organizationName: org.name,
            role: item.role,
            currency: org.currency,
          };
          return membershipRow;
        })
        .sort((a, b) => a.organizationName.localeCompare(b.organizationName));
    },
    async getOrganization(organizationId) {
      await ready();
      requireRole(organizationId);
      return organization(organizationId);
    },
    async listTeam(organizationId) {
      await ready();
      requireRole(organizationId);
      const team: TeamMember[] = db.memberships
        .filter((item) => item.organizationId === organizationId)
        .map((item) => {
          const user = userById(item.userId);
          return {
            userId: item.userId,
            fullName: user?.fullName ?? 'Teammate',
            email: user?.email ?? '',
            role: item.role,
          };
        });
      return team.sort((a, b) => compareRoles(a.role, b.role) || a.fullName.localeCompare(b.fullName));
    },
    async getDashboard(organizationId) {
      await ready();
      const row = requireRole(organizationId);
      if (!canViewDashboard(row.role)) {
        throw new BillkitError('Your role does not include the revenue dashboard.', 'permission');
      }
      const org = organization(organizationId);
      const invoices = db.invoices.filter((invoice) => invoice.organizationId === organizationId);
      const dashboard: Dashboard = buildDashboard({
        currency: org.currency,
        asOf,
        customers: db.customers.filter((item) => item.organizationId === organizationId),
        payments: db.payments
          .filter((payment) => payment.organizationId === organizationId)
          .map((payment) => ({ amountCents: payment.amountCents, createdAt: payment.createdAt })),
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          customerId: invoice.customerId,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          totalCents: invoice.totalCents,
          paidCents: paidCents(invoice.id),
          updatedAt: invoice.updatedAt,
        })),
      });
      return dashboard;
    },
    async listCustomers(organizationId) {
      await ready();
      const row = requireRole(organizationId);
      if (row.role === 'viewer') {
        throw new BillkitError('Viewers cannot open the customer list.', 'permission');
      }
      return db.customers
        .filter((item) => item.organizationId === organizationId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async createCustomer(organizationId, input: CustomerInput) {
      await ready();
      const row = requireRole(organizationId);
      if (!canManageCustomers(row.role)) {
        throw new BillkitError('Your role cannot add customers.', 'permission');
      }
      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();
      if (!name) throw new BillkitError('Enter the customer name.', 'validation');
      if (!isEmail(email)) throw new BillkitError('Enter a valid customer email.', 'validation');
      db.ids.customer += 1;
      const created: Customer = {
        id: `cus_${db.ids.customer}`,
        organizationId,
        name,
        email,
        company: input.company.trim(),
      };
      db.customers.push(created);
      await persist();
      emit({ type: 'changed' });
      return created;
    },
    async listInvoices(organizationId, filter: InvoiceFilter, query: string) {
      await ready();
      requireRole(organizationId);
      const needle = query.trim().toLowerCase();
      return db.invoices
        .filter((invoice) => invoice.organizationId === organizationId)
        .map((invoice) => ({ invoice, summary: summarize(invoice) }))
        .filter(({ invoice, summary }) => matchesFilter(summary, invoice.status, filter))
        .filter(({ invoice, summary }) => {
          if (!needle) return true;
          const person = db.customers.find((item) => item.id === invoice.customerId);
          return (
            summary.number.toLowerCase().includes(needle) ||
            summary.customerName.toLowerCase().includes(needle) ||
            (person?.email.toLowerCase().includes(needle) ?? false)
          );
        })
        .sort((a, b) => b.invoice.issueDate.localeCompare(a.invoice.issueDate) || b.summary.number.localeCompare(a.summary.number))
        .map(({ summary }) => summary);
    },
    async getInvoice(organizationId, invoiceId) {
      await ready();
      requireRole(organizationId);
      return detail(findInvoice(organizationId, invoiceId));
    },
    async createInvoice(organizationId, input) {
      await ready();
      const row = requireRole(organizationId);
      if (!canCreateInvoice(row.role)) throw new BillkitError('Your role cannot create invoices.', 'permission');
      validateInvoiceInput(input);
      const person = customer(input.customerId, organizationId);
      const org = organization(organizationId);
      const priced = priceLines(input.lines, input.taxRatePercent);
      const sequence = db.sequences[organizationId] ?? 1000;
      db.sequences[organizationId] = sequence + 1;
      db.ids.invoice += 1;
      const id = `inv_${db.ids.invoice}`;
      const stamp = nowIso();
      const invoice: InvoiceRow = {
        id,
        organizationId,
        customerId: person.id,
        number: `INV-${sequence}`,
        status: 'draft',
        issueDate: asOf,
        dueDate: input.dueDate,
        currency: org.currency,
        taxRatePercent: input.taxRatePercent,
        notes: input.notes.trim(),
        subtotalCents: priced.subtotalCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
        publicToken: `pay_${id}`,
        sentAt: null,
        viewedAt: null,
        paidAt: null,
        createdBy: row.userId,
        updatedAt: stamp,
      };
      db.invoices.push(invoice);
      input.lines.forEach((line, index) => {
        db.ids.line += 1;
        db.lines.push({
          id: `line_${db.ids.line}`,
          invoiceId: id,
          organizationId,
          description: line.description.trim(),
          quantity: line.quantity,
          unitAmountCents: line.unitAmountCents,
          sortOrder: index,
        });
      });
      db.ids.event += 1;
      db.events.push({
        id: `evt_${db.ids.event}`,
        invoiceId: id,
        organizationId,
        type: 'created',
        message: 'Draft created',
        createdAt: stamp,
      });
      await persist();
      emit({ type: 'changed' });
      return detail(invoice);
    },
    async sendInvoice(organizationId, invoiceId) {
      await ready();
      const row = requireRole(organizationId);
      if (!canSendInvoice(row.role)) throw new BillkitError('Your role cannot send invoices.', 'permission');
      const invoice = findInvoice(organizationId, invoiceId);
      if (invoice.status !== 'draft') throw new BillkitError('This invoice was already sent.', 'conflict');
      const person = customer(invoice.customerId, organizationId);
      const stamp = nowIso();
      invoice.status = 'sent';
      invoice.sentAt = stamp;
      invoice.updatedAt = stamp;
      db.ids.event += 1;
      db.events.push({
        id: `evt_${db.ids.event}`,
        invoiceId: invoice.id,
        organizationId,
        type: 'sent',
        message: `Sent to ${person.email}`,
        createdAt: stamp,
      });
      await persist();
      emit({ type: 'changed' });
      return detail(invoice);
    },
    async sendReminder(organizationId, invoiceId) {
      await ready();
      const row = requireRole(organizationId);
      if (!canSendInvoice(row.role)) throw new BillkitError('Your role cannot send reminders.', 'permission');
      const invoice = findInvoice(organizationId, invoiceId);
      if (invoice.status === 'draft') {
        throw new BillkitError('Send the invoice before reminding the customer.', 'conflict');
      }
      if (invoice.status === 'paid' || invoice.status === 'void' || invoice.totalCents - paidCents(invoice.id) <= 0) {
        throw new BillkitError('This invoice is already paid.', 'conflict');
      }
      const person = customer(invoice.customerId, organizationId);
      const stamp = nowIso();
      invoice.updatedAt = stamp;
      db.ids.event += 1;
      const message = `Reminder queued for ${person.email}`;
      db.events.push({
        id: `evt_${db.ids.event}`,
        invoiceId: invoice.id,
        organizationId,
        type: 'reminder',
        message,
        createdAt: stamp,
      });
      await persist();
      emit({ type: 'changed' });
      return detail(invoice);
    },
    async getSharedInvoice(token) {
      await ready();
      const invoice = findByToken(token);
      const org = organization(invoice.organizationId);
      const person = db.customers.find((item) => item.id === invoice.customerId);
      if (invoice.status === 'sent') {
        const stamp = nowIso();
        invoice.status = 'viewed';
        invoice.viewedAt = stamp;
        invoice.updatedAt = stamp;
        db.ids.event += 1;
        db.events.push({
          id: `evt_${db.ids.event}`,
          invoiceId: invoice.id,
          organizationId: invoice.organizationId,
          type: 'viewed',
          message: 'Opened by the customer',
          createdAt: stamp,
        });
        notifyFinance(invoice.organizationId, 'Invoice viewed', `${person?.name ?? 'A customer'} opened ${invoice.number}.`, invoice.id);
        await persist();
        emit({ type: 'changed' });
      }
      const balance = Math.max(invoice.totalCents - paidCents(invoice.id), 0);
      const shared: SharedInvoice = {
        token: invoice.publicToken,
        organizationName: org.name,
        organizationEmail: org.email,
        currency: invoice.currency,
        number: invoice.number,
        customerName: person?.name ?? 'Customer',
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        lines: lineItems(invoice.id),
        subtotalCents: invoice.subtotalCents,
        taxCents: invoice.taxCents,
        totalCents: invoice.totalCents,
        balanceCents: balance,
        displayStatus: displayStatus(invoice.status, invoice.dueDate, asOf, balance),
        notes: invoice.notes,
        paidAt: invoice.paidAt,
        taxLabel: org.taxLabel,
      };
      return shared;
    },
    async paySharedInvoice(token, cardNumber) {
      await ready();
      const invoice = findByToken(token);
      const balance = invoice.totalCents - paidCents(invoice.id);
      if (balance <= 0 || invoice.status === 'paid') {
        throw new BillkitError('This invoice is already paid.', 'conflict');
      }
      if (normalizeCardNumber(cardNumber) !== TEST_CARD) {
        throw new BillkitError('That card was declined. Use the test card 4242 4242 4242 4242.', 'validation');
      }
      const person = db.customers.find((item) => item.id === invoice.customerId);
      const stamp = nowIso();
      db.ids.payment += 1;
      db.payments.push({
        id: `pay_${db.ids.payment}`,
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        amountCents: balance,
        createdAt: stamp,
      });
      invoice.status = 'paid';
      invoice.paidAt = stamp;
      invoice.updatedAt = stamp;
      db.ids.event += 1;
      db.events.push({
        id: `evt_${db.ids.event}`,
        invoiceId: invoice.id,
        organizationId: invoice.organizationId,
        type: 'payment',
        message: 'Paid in full',
        createdAt: stamp,
      });
      const message = `${invoice.number} was paid by ${person?.name ?? 'the customer'}.`;
      notifyFinance(invoice.organizationId, 'Invoice paid', message, invoice.id);
      await persist();
      const result: PaymentResult = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        organizationId: invoice.organizationId,
        amountCents: balance,
        currency: invoice.currency,
        paidAt: stamp,
      };
      emit({
        type: 'invoice.paid',
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        message,
      });
      return result;
    },
    async createCheckout(token): Promise<CheckoutSession> {
      await ready();
      findByToken(token);
      return { mode: 'mock' };
    },
    async listNotifications(organizationId) {
      await ready();
      const user = requireUser();
      requireRole(organizationId);
      const items: AppNotification[] = db.notifications
        .filter((item) => item.organizationId === organizationId && item.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((item) => ({
          id: item.id,
          organizationId: item.organizationId,
          title: item.title,
          body: item.body,
          invoiceId: item.invoiceId,
          readAt: item.readAt,
          createdAt: item.createdAt,
        }));
      return items;
    },
    async markNotificationRead(organizationId, notificationId) {
      await ready();
      const user = requireUser();
      const item = db.notifications.find(
        (notification) =>
          notification.id === notificationId &&
          notification.organizationId === organizationId &&
          notification.userId === user.id,
      );
      if (!item) throw new BillkitError('That alert is no longer available.', 'not_found');
      if (!item.readAt) item.readAt = nowIso();
      await persist();
      emit({ type: 'changed' });
    },
    async markAllNotificationsRead(organizationId) {
      await ready();
      const user = requireUser();
      const stamp = nowIso();
      for (const item of db.notifications) {
        if (item.organizationId === organizationId && item.userId === user.id && !item.readAt) {
          item.readAt = stamp;
        }
      }
      await persist();
      emit({ type: 'changed' });
    },
    async registerPushToken(input) {
      await ready();
      const user = requireUser();
      db.pushTokens = db.pushTokens.filter((item) => item.userId !== user.id);
      db.pushTokens.push({
        id: `push_${user.id}`,
        userId: user.id,
        token: input.token,
        platform: input.platform,
      });
      await persist();
    },
    async getPushRegistration() {
      await ready();
      const user = requireUser();
      const token = db.pushTokens.find((item) => item.userId === user.id);
      return token ? { token: token.token, platform: token.platform } : null;
    },
  };

  return repository;
}
