import { atDemoTime } from '../domain/dates';
import { priceLines } from '../domain/invoiceMath';
import type {
  Customer,
  InvoiceEvent,
  InvoiceEventType,
  InvoiceLineInput,
  Organization,
  Role,
  StoredInvoiceStatus,
} from '../domain/types';
import { DEMO_AS_OF, DEMO_PASSWORD } from '../domain/types';

export type UserRow = {
  id: string;
  email: string;
  fullName: string;
  password: string;
};

export type MembershipRow = {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
};

export type InvoiceRow = {
  id: string;
  organizationId: string;
  customerId: string;
  number: string;
  status: StoredInvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRatePercent: number;
  notes: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  publicToken: string;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  createdBy: string;
  updatedAt: string;
};

export type LineRow = {
  id: string;
  invoiceId: string;
  organizationId: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  sortOrder: number;
};

export type EventRow = InvoiceEvent & {
  invoiceId: string;
  organizationId: string;
};

export type PaymentRow = {
  id: string;
  invoiceId: string;
  organizationId: string;
  amountCents: number;
  createdAt: string;
};

export type NotificationRow = {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  body: string;
  invoiceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type PushTokenRow = {
  id: string;
  userId: string;
  token: string;
  platform: string;
};

export type MagicTokenRow = {
  token: string;
  email: string;
};

export type Database = {
  users: UserRow[];
  sessionUserId: string | null;
  organizations: Organization[];
  memberships: MembershipRow[];
  customers: Customer[];
  invoices: InvoiceRow[];
  lines: LineRow[];
  events: EventRow[];
  payments: PaymentRow[];
  notifications: NotificationRow[];
  pushTokens: PushTokenRow[];
  magicTokens: MagicTokenRow[];
  sequences: Record<string, number>;
  ids: {
    invoice: number;
    customer: number;
    event: number;
    payment: number;
    notification: number;
    line: number;
  };
};

type InvoiceSeed = {
  id: string;
  organizationId: string;
  customerId: string;
  number: string;
  status: StoredInvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRatePercent: number;
  notes: string;
  publicToken: string;
  createdBy: string;
  lines: InvoiceLineInput[];
  payments?: { id: string; amountCents: number; createdAt: string }[];
  events: { id: string; type: InvoiceEventType; message: string; createdAt: string }[];
  sentAt?: string | null;
  viewedAt?: string | null;
  paidAt?: string | null;
};

function addInvoice(db: Database, seed: InvoiceSeed): void {
  const priced = priceLines(seed.lines, seed.taxRatePercent);
  const updatedAt = seed.events[seed.events.length - 1]?.createdAt ?? atDemoTime(seed.issueDate);
  db.invoices.push({
    id: seed.id,
    organizationId: seed.organizationId,
    customerId: seed.customerId,
    number: seed.number,
    status: seed.status,
    issueDate: seed.issueDate,
    dueDate: seed.dueDate,
    currency: seed.currency,
    taxRatePercent: seed.taxRatePercent,
    notes: seed.notes,
    subtotalCents: priced.subtotalCents,
    taxCents: priced.taxCents,
    totalCents: priced.totalCents,
    publicToken: seed.publicToken,
    sentAt: seed.sentAt ?? null,
    viewedAt: seed.viewedAt ?? null,
    paidAt: seed.paidAt ?? null,
    createdBy: seed.createdBy,
    updatedAt,
  });
  seed.lines.forEach((line, index) => {
    db.lines.push({
      id: `${seed.id}_line_${index + 1}`,
      invoiceId: seed.id,
      organizationId: seed.organizationId,
      description: line.description,
      quantity: line.quantity,
      unitAmountCents: line.unitAmountCents,
      sortOrder: index,
    });
  });
  for (const event of seed.events) {
    db.events.push({ ...event, invoiceId: seed.id, organizationId: seed.organizationId });
  }
  for (const payment of seed.payments ?? []) {
    db.payments.push({ ...payment, invoiceId: seed.id, organizationId: seed.organizationId });
  }
}

export function createSeed(asOf = DEMO_AS_OF): Database {
  const db: Database = {
    users: [
      { id: 'user_maya', email: 'maya@northwind.studio', fullName: 'Maya Chen', password: DEMO_PASSWORD },
      { id: 'user_jordan', email: 'jordan@northwind.studio', fullName: 'Jordan Blake', password: DEMO_PASSWORD },
      { id: 'user_sam', email: 'sam@northwind.studio', fullName: 'Sam Okonkwo', password: DEMO_PASSWORD },
      { id: 'user_nia', email: 'nia@northwind.studio', fullName: 'Nia Rahman', password: DEMO_PASSWORD },
      { id: 'user_riley', email: 'riley@harborandco.com', fullName: 'Riley Costa', password: DEMO_PASSWORD },
    ],
    sessionUserId: null,
    organizations: [
      {
        id: 'org_northwind',
        name: 'Northwind Studio',
        slug: 'northwind',
        currency: 'USD',
        taxLabel: 'Sales tax',
        defaultTaxRatePercent: 8.5,
        email: 'billing@northwind.studio',
        addressLine1: '128 Mercer Street',
        addressLine2: 'Studio 4',
        city: 'New York',
        region: 'NY',
        postalCode: '10012',
      },
      {
        id: 'org_harbor',
        name: 'Harbor & Co',
        slug: 'harbor',
        currency: 'EUR',
        taxLabel: 'VAT',
        defaultTaxRatePercent: 23,
        email: 'billing@harborandco.com',
        addressLine1: '14 Quay Lane',
        addressLine2: '',
        city: 'Lisbon',
        region: '',
        postalCode: '1200-479',
      },
    ],
    memberships: [
      { id: 'mem_maya_nw', organizationId: 'org_northwind', userId: 'user_maya', role: 'owner' },
      { id: 'mem_jordan_nw', organizationId: 'org_northwind', userId: 'user_jordan', role: 'admin' },
      { id: 'mem_nia_nw', organizationId: 'org_northwind', userId: 'user_nia', role: 'member' },
      { id: 'mem_sam_nw', organizationId: 'org_northwind', userId: 'user_sam', role: 'viewer' },
      { id: 'mem_riley_hb', organizationId: 'org_harbor', userId: 'user_riley', role: 'owner' },
      { id: 'mem_maya_hb', organizationId: 'org_harbor', userId: 'user_maya', role: 'accountant' },
    ],
    customers: [
      { id: 'cus_lumen', organizationId: 'org_northwind', name: 'Lumen Health', email: 'ada@lumen.health', company: 'Lumen Health' },
      { id: 'cus_atlas', organizationId: 'org_northwind', name: 'Atlas Goods', email: 'billing@atlasgoods.com', company: 'Atlas Goods' },
      { id: 'cus_paper', organizationId: 'org_northwind', name: 'Paper & Pine', email: 'hello@paperandpine.co', company: 'Paper & Pine' },
      { id: 'cus_kite', organizationId: 'org_northwind', name: 'Kite School', email: 'finance@kiteschool.org', company: 'Kite School' },
      { id: 'cus_bright', organizationId: 'org_northwind', name: 'Brightline Legal', email: 'ap@brightline.law', company: 'Brightline Legal' },
      { id: 'cus_rio', organizationId: 'org_harbor', name: 'Rio Ceramics', email: 'studio@rioceramics.pt', company: 'Rio Ceramics' },
      { id: 'cus_mare', organizationId: 'org_harbor', name: 'Maré Hotel', email: 'accounts@marehotel.pt', company: 'Maré Hotel' },
    ],
    invoices: [],
    lines: [],
    events: [],
    payments: [],
    notifications: [],
    pushTokens: [],
    magicTokens: [],
    sequences: { org_northwind: 1057, org_harbor: 229 },
    ids: { invoice: 2000, customer: 50, event: 100, payment: 50, notification: 50, line: 100 },
  };

  addInvoice(db, {
    id: 'inv_1004',
    organizationId: 'org_northwind',
    customerId: 'cus_lumen',
    number: 'INV-1004',
    status: 'paid',
    issueDate: '2026-06-20',
    dueDate: '2026-07-04',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Identity workshop, two days on site.',
    publicToken: 'pay_lumen_1004',
    createdBy: 'user_maya',
    lines: [{ description: 'Identity workshop', quantity: 1, unitAmountCents: 180000 }],
    sentAt: atDemoTime('2026-06-20', 14),
    paidAt: atDemoTime('2026-07-08', 11),
    payments: [{ id: 'pay_1004', amountCents: 195300, createdAt: atDemoTime('2026-07-08', 11) }],
    events: [
      { id: 'evt_1004_c', type: 'created', message: 'Draft created', createdAt: atDemoTime('2026-06-20', 13) },
      { id: 'evt_1004_s', type: 'sent', message: 'Sent to ada@lumen.health', createdAt: atDemoTime('2026-06-20', 14) },
      { id: 'evt_1004_p', type: 'payment', message: 'Paid in full', createdAt: atDemoTime('2026-07-08', 11) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1018',
    organizationId: 'org_northwind',
    customerId: 'cus_kite',
    number: 'INV-1018',
    status: 'paid',
    issueDate: '2026-08-20',
    dueDate: '2026-09-10',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Summer camp microsite, including two revision rounds.',
    publicToken: 'pay_kite_1018',
    createdBy: 'user_maya',
    lines: [{ description: 'Summer camp microsite', quantity: 1, unitAmountCents: 480000 }],
    sentAt: atDemoTime('2026-08-20', 15),
    paidAt: atDemoTime('2026-09-15', 10),
    payments: [{ id: 'pay_1018', amountCents: 520800, createdAt: atDemoTime('2026-09-15', 10) }],
    events: [
      { id: 'evt_1018_s', type: 'sent', message: 'Sent to finance@kiteschool.org', createdAt: atDemoTime('2026-08-20', 15) },
      { id: 'evt_1018_p', type: 'payment', message: 'Paid in full', createdAt: atDemoTime('2026-09-15', 10) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1022',
    organizationId: 'org_northwind',
    customerId: 'cus_atlas',
    number: 'INV-1022',
    status: 'paid',
    issueDate: '2026-09-20',
    dueDate: '2026-10-05',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Fall catalog, 32 pages.',
    publicToken: 'pay_atlas_1022',
    createdBy: 'user_jordan',
    lines: [{ description: 'Fall catalog design', quantity: 1, unitAmountCents: 220000 }],
    sentAt: atDemoTime('2026-09-20', 16),
    paidAt: atDemoTime('2026-10-09', 9),
    payments: [{ id: 'pay_1022', amountCents: 238700, createdAt: atDemoTime('2026-10-09', 9) }],
    events: [
      { id: 'evt_1022_s', type: 'sent', message: 'Sent to billing@atlasgoods.com', createdAt: atDemoTime('2026-09-20', 16) },
      { id: 'evt_1022_p', type: 'payment', message: 'Paid in full', createdAt: atDemoTime('2026-10-09', 9) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1042',
    organizationId: 'org_northwind',
    customerId: 'cus_lumen',
    number: 'INV-1042',
    status: 'sent',
    issueDate: '2026-10-14',
    dueDate: '2026-10-28',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'October retainer. Payment was due on the 28th.',
    publicToken: 'pay_lumen_1042',
    createdBy: 'user_maya',
    lines: [{ description: 'Brand and product design retainer', quantity: 1, unitAmountCents: 420000 }],
    sentAt: atDemoTime('2026-10-14', 15),
    events: [
      { id: 'evt_1042_c', type: 'created', message: 'Draft created', createdAt: atDemoTime('2026-10-14', 14) },
      { id: 'evt_1042_s', type: 'sent', message: 'Sent to ada@lumen.health', createdAt: atDemoTime('2026-10-14', 15) },
      { id: 'evt_1042_r1', type: 'reminder', message: 'Reminder queued for ada@lumen.health', createdAt: atDemoTime('2026-11-01', 15) },
      { id: 'evt_1042_r2', type: 'reminder', message: 'Reminder queued for ada@lumen.health', createdAt: atDemoTime('2026-11-20', 15) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1036',
    organizationId: 'org_northwind',
    customerId: 'cus_kite',
    number: 'INV-1036',
    status: 'paid',
    issueDate: '2026-10-20',
    dueDate: '2026-11-10',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Spring enrollment campaign.',
    publicToken: 'pay_kite_1036',
    createdBy: 'user_maya',
    lines: [{ description: 'Spring enrollment campaign', quantity: 1, unitAmountCents: 640000 }],
    sentAt: atDemoTime('2026-10-20', 12),
    paidAt: atDemoTime('2026-11-04', 18),
    payments: [{ id: 'pay_1036', amountCents: 694400, createdAt: atDemoTime('2026-11-04', 18) }],
    events: [
      { id: 'evt_1036_s', type: 'sent', message: 'Sent to finance@kiteschool.org', createdAt: atDemoTime('2026-10-20', 12) },
      { id: 'evt_1036_p', type: 'payment', message: 'Paid in full', createdAt: atDemoTime('2026-11-04', 18) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1031',
    organizationId: 'org_northwind',
    customerId: 'cus_bright',
    number: 'INV-1031',
    status: 'paid',
    issueDate: '2026-11-01',
    dueDate: '2026-11-20',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Website refresh, 40 hours.',
    publicToken: 'pay_bright_1031',
    createdBy: 'user_jordan',
    lines: [{ description: 'Website refresh', quantity: 40, unitAmountCents: 15000 }],
    sentAt: atDemoTime('2026-11-01', 17),
    paidAt: atDemoTime('2026-11-18', 13),
    payments: [{ id: 'pay_1031', amountCents: 651000, createdAt: atDemoTime('2026-11-18', 13) }],
    events: [
      { id: 'evt_1031_s', type: 'sent', message: 'Sent to ap@brightline.law', createdAt: atDemoTime('2026-11-01', 17) },
      { id: 'evt_1031_p', type: 'payment', message: 'Paid in full', createdAt: atDemoTime('2026-11-18', 13) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1051',
    organizationId: 'org_northwind',
    customerId: 'cus_paper',
    number: 'INV-1051',
    status: 'viewed',
    issueDate: '2026-11-02',
    dueDate: '2026-11-20',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Twelve packaging illustrations.',
    publicToken: 'pay_paper_1051',
    createdBy: 'user_maya',
    lines: [{ description: 'Packaging illustrations', quantity: 12, unitAmountCents: 8500 }],
    sentAt: atDemoTime('2026-11-02', 11),
    viewedAt: atDemoTime('2026-11-21', 9),
    events: [
      { id: 'evt_1051_s', type: 'sent', message: 'Sent to hello@paperandpine.co', createdAt: atDemoTime('2026-11-02', 11) },
      { id: 'evt_1051_v', type: 'viewed', message: 'Opened by the customer', createdAt: atDemoTime('2026-11-21', 9) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1044',
    organizationId: 'org_northwind',
    customerId: 'cus_bright',
    number: 'INV-1044',
    status: 'partial',
    issueDate: '2026-11-10',
    dueDate: '2026-11-30',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Deposit received. Balance due on the 30th.',
    publicToken: 'pay_bright_1044',
    createdBy: 'user_jordan',
    lines: [{ description: 'Contract template set', quantity: 1, unitAmountCents: 300000 }],
    sentAt: atDemoTime('2026-11-10', 15),
    payments: [{ id: 'pay_1044', amountCents: 100000, createdAt: atDemoTime('2026-11-12', 10) }],
    events: [
      { id: 'evt_1044_s', type: 'sent', message: 'Sent to ap@brightline.law', createdAt: atDemoTime('2026-11-10', 15) },
      { id: 'evt_1044_p', type: 'payment', message: 'Partial payment recorded', createdAt: atDemoTime('2026-11-12', 10) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1048',
    organizationId: 'org_northwind',
    customerId: 'cus_atlas',
    number: 'INV-1048',
    status: 'sent',
    issueDate: '2026-11-18',
    dueDate: '2026-12-12',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Brand film and a set of stills for the winter drop.',
    publicToken: 'pay_atlas_1048',
    createdBy: 'user_maya',
    lines: [{ description: 'Brand film and stills', quantity: 2, unitAmountCents: 180000 }],
    sentAt: atDemoTime('2026-11-18', 16),
    events: [
      { id: 'evt_1048_c', type: 'created', message: 'Draft created', createdAt: atDemoTime('2026-11-18', 15) },
      { id: 'evt_1048_s', type: 'sent', message: 'Sent to billing@atlasgoods.com', createdAt: atDemoTime('2026-11-18', 16) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1056',
    organizationId: 'org_northwind',
    customerId: 'cus_paper',
    number: 'INV-1056',
    status: 'sent',
    issueDate: '2026-11-22',
    dueDate: '2026-12-01',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Holiday card suite, three designs.',
    publicToken: 'pay_paper_1056',
    createdBy: 'user_nia',
    lines: [{ description: 'Holiday card suite', quantity: 3, unitAmountCents: 12000 }],
    sentAt: atDemoTime('2026-11-22', 18),
    events: [
      { id: 'evt_1056_s', type: 'sent', message: 'Sent to hello@paperandpine.co', createdAt: atDemoTime('2026-11-22', 18) },
    ],
  });

  addInvoice(db, {
    id: 'inv_1054',
    organizationId: 'org_northwind',
    customerId: 'cus_lumen',
    number: 'INV-1054',
    status: 'draft',
    issueDate: asOf,
    dueDate: '2026-12-25',
    currency: 'USD',
    taxRatePercent: 8.5,
    notes: 'Hold until the workshop dates are confirmed.',
    publicToken: 'pay_lumen_1054',
    createdBy: 'user_maya',
    lines: [{ description: 'Q1 workshop facilitation', quantity: 1, unitAmountCents: 250000 }],
    events: [{ id: 'evt_1054_c', type: 'created', message: 'Draft created', createdAt: atDemoTime(asOf, 9) }],
  });

  addInvoice(db, {
    id: 'inv_220',
    organizationId: 'org_harbor',
    customerId: 'cus_rio',
    number: 'INV-220',
    status: 'sent',
    issueDate: '2026-10-01',
    dueDate: '2026-10-30',
    currency: 'EUR',
    taxRatePercent: 23,
    notes: 'Showroom lighting plan.',
    publicToken: 'pay_rio_220',
    createdBy: 'user_riley',
    lines: [{ description: 'Showroom lighting plan', quantity: 1, unitAmountCents: 180000 }],
    sentAt: atDemoTime('2026-10-01', 10),
    events: [
      { id: 'evt_220_s', type: 'sent', message: 'Sent to studio@rioceramics.pt', createdAt: atDemoTime('2026-10-01', 10) },
    ],
  });

  addInvoice(db, {
    id: 'inv_226',
    organizationId: 'org_harbor',
    customerId: 'cus_mare',
    number: 'INV-226',
    status: 'paid',
    issueDate: '2026-10-28',
    dueDate: '2026-11-11',
    currency: 'EUR',
    taxRatePercent: 23,
    notes: 'Wayfinding system for the lobby and rooms.',
    publicToken: 'pay_mare_226',
    createdBy: 'user_riley',
    lines: [{ description: 'Wayfinding system', quantity: 1, unitAmountCents: 96000 }],
    sentAt: atDemoTime('2026-10-28', 12),
    paidAt: atDemoTime('2026-11-12', 15),
    payments: [{ id: 'pay_226', amountCents: 118080, createdAt: atDemoTime('2026-11-12', 15) }],
    events: [
      { id: 'evt_226_s', type: 'sent', message: 'Sent to accounts@marehotel.pt', createdAt: atDemoTime('2026-10-28', 12) },
      { id: 'evt_226_p', type: 'payment', message: 'Paid in full', createdAt: atDemoTime('2026-11-12', 15) },
    ],
  });

  addInvoice(db, {
    id: 'inv_228',
    organizationId: 'org_harbor',
    customerId: 'cus_rio',
    number: 'INV-228',
    status: 'draft',
    issueDate: asOf,
    dueDate: '2026-12-20',
    currency: 'EUR',
    taxRatePercent: 23,
    notes: '',
    publicToken: 'pay_rio_228',
    createdBy: 'user_maya',
    lines: [{ description: 'Sample board', quantity: 4, unitAmountCents: 7500 }],
    events: [{ id: 'evt_228_c', type: 'created', message: 'Draft created', createdAt: atDemoTime(asOf, 8) }],
  });

  db.notifications.push(
    {
      id: 'ntf_view_1051',
      organizationId: 'org_northwind',
      userId: 'user_maya',
      title: 'Invoice viewed',
      body: 'Paper & Pine opened INV-1051.',
      invoiceId: 'inv_1051',
      readAt: null,
      createdAt: atDemoTime('2026-11-21', 9),
    },
    {
      id: 'ntf_paid_1036',
      organizationId: 'org_northwind',
      userId: 'user_maya',
      title: 'Invoice paid',
      body: 'Kite School paid INV-1036.',
      invoiceId: 'inv_1036',
      readAt: atDemoTime('2026-11-04', 19),
      createdAt: atDemoTime('2026-11-04', 18),
    },
    {
      id: 'ntf_paid_1036_jordan',
      organizationId: 'org_northwind',
      userId: 'user_jordan',
      title: 'Invoice paid',
      body: 'Kite School paid INV-1036.',
      invoiceId: 'inv_1036',
      readAt: atDemoTime('2026-11-05', 9),
      createdAt: atDemoTime('2026-11-04', 18),
    },
    {
      id: 'ntf_paid_226',
      organizationId: 'org_harbor',
      userId: 'user_maya',
      title: 'Invoice paid',
      body: 'Maré Hotel paid INV-226.',
      invoiceId: 'inv_226',
      readAt: atDemoTime('2026-11-12', 16),
      createdAt: atDemoTime('2026-11-12', 15),
    },
    {
      id: 'ntf_paid_226_riley',
      organizationId: 'org_harbor',
      userId: 'user_riley',
      title: 'Invoice paid',
      body: 'Maré Hotel paid INV-226.',
      invoiceId: 'inv_226',
      readAt: null,
      createdAt: atDemoTime('2026-11-12', 15),
    },
  );

  return db;
}
