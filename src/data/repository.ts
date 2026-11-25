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
  MagicLinkRequest,
  Membership,
  Organization,
  PaymentResult,
  PushRegistration,
  RepoEvent,
  Session,
  SharedInvoice,
  TeamMember,
} from '../domain/types';

export interface BillkitRepository {
  readonly mode: Session['mode'];
  ready(): Promise<void>;
  subscribe(listener: (event: RepoEvent) => void): () => void;
  today(): string;
  signInWithPassword(email: string, password: string): Promise<Session>;
  requestMagicLink(email: string): Promise<MagicLinkRequest>;
  completeMagicLink(token: string): Promise<Session>;
  completeAuthCallback(url: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  enterDemo(): Promise<Session>;
  resetDemo(): Promise<void>;
  listMemberships(): Promise<Membership[]>;
  getOrganization(organizationId: string): Promise<Organization>;
  listTeam(organizationId: string): Promise<TeamMember[]>;
  getDashboard(organizationId: string): Promise<Dashboard>;
  listCustomers(organizationId: string): Promise<Customer[]>;
  createCustomer(organizationId: string, input: CustomerInput): Promise<Customer>;
  listInvoices(organizationId: string, filter: InvoiceFilter, query: string): Promise<InvoiceSummary[]>;
  getInvoice(organizationId: string, invoiceId: string): Promise<InvoiceDetail>;
  createInvoice(organizationId: string, input: InvoiceInput): Promise<InvoiceDetail>;
  sendInvoice(organizationId: string, invoiceId: string): Promise<InvoiceDetail>;
  sendReminder(organizationId: string, invoiceId: string): Promise<InvoiceDetail>;
  getSharedInvoice(token: string): Promise<SharedInvoice>;
  paySharedInvoice(token: string, cardNumber: string): Promise<PaymentResult>;
  createCheckout(token: string): Promise<CheckoutSession>;
  listNotifications(organizationId: string): Promise<AppNotification[]>;
  markNotificationRead(organizationId: string, notificationId: string): Promise<void>;
  markAllNotificationsRead(organizationId: string): Promise<void>;
  registerPushToken(input: PushRegistration): Promise<void>;
  getPushRegistration(): Promise<PushRegistration | null>;
}
