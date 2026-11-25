export type Role = 'owner' | 'admin' | 'accountant' | 'member' | 'viewer';

export type StoredInvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'void';

export type DisplayStatus = StoredInvoiceStatus | 'overdue';

export type InvoiceFilter = 'all' | 'unpaid' | 'overdue' | 'paid' | 'draft';

export type DataMode = 'mock' | 'supabase';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  mode: DataMode;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  taxLabel: string;
  defaultTaxRatePercent: number;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
};

export type Membership = {
  organizationId: string;
  organizationName: string;
  role: Role;
  currency: string;
};

export type TeamMember = {
  userId: string;
  fullName: string;
  email: string;
  role: Role;
};

export type Customer = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  company: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export type InvoiceEventType = 'created' | 'sent' | 'viewed' | 'reminder' | 'payment' | 'void';

export type InvoiceEvent = {
  id: string;
  type: InvoiceEventType;
  message: string;
  createdAt: string;
};

export type InvoiceSummary = {
  id: string;
  number: string;
  customerName: string;
  displayStatus: DisplayStatus;
  totalCents: number;
  balanceCents: number;
  currency: string;
  dueDate: string;
  issueDate: string;
};

export type InvoiceDetail = InvoiceSummary & {
  organizationId: string;
  customer: Customer;
  status: StoredInvoiceStatus;
  taxRatePercent: number;
  notes: string;
  lines: LineItem[];
  subtotalCents: number;
  taxCents: number;
  paidCents: number;
  publicToken: string;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  events: InvoiceEvent[];
};

export type MonthBucket = {
  key: string;
  label: string;
  collectedCents: number;
};

export type Dashboard = {
  currency: string;
  periodLabel: string;
  asOf: string;
  collectedThisMonthCents: number;
  outstandingCents: number;
  overdueCents: number;
  openCount: number;
  monthly: MonthBucket[];
  attention: InvoiceSummary[];
  recent: InvoiceSummary[];
};

export type AppNotification = {
  id: string;
  organizationId: string;
  title: string;
  body: string;
  invoiceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type SharedInvoice = {
  token: string;
  organizationName: string;
  organizationEmail: string;
  currency: string;
  number: string;
  customerName: string;
  dueDate: string;
  issueDate: string;
  lines: LineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  balanceCents: number;
  displayStatus: DisplayStatus;
  notes: string;
  paidAt: string | null;
  taxLabel: string;
};

export type CustomerInput = {
  name: string;
  email: string;
  company: string;
};

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitAmountCents: number;
};

export type InvoiceInput = {
  customerId: string;
  dueDate: string;
  taxRatePercent: number;
  notes: string;
  lines: InvoiceLineInput[];
};

export type PaymentResult = {
  invoiceId: string;
  invoiceNumber: string;
  organizationId: string;
  amountCents: number;
  currency: string;
  paidAt: string;
};

export type CheckoutSession =
  | { mode: 'mock' }
  | { mode: 'stripe'; url: string };

export type PushRegistration = {
  token: string;
  platform: string;
};

export type MagicLinkRequest = {
  email: string;
  previewToken: string | null;
};

export type RepoEvent =
  | { type: 'changed' }
  | {
      type: 'invoice.paid';
      organizationId: string;
      invoiceId: string;
      invoiceNumber: string;
      message: string;
    };

export const DEMO_AS_OF = '2026-11-25';
export const DEMO_PASSWORD = 'billkit-demo';
export const DEMO_OWNER_EMAIL = 'maya@northwind.studio';
export const TEST_CARD = '4242424242424242';
