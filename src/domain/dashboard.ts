import { monthKey, periodLabel, recentMonths } from './dates';
import { displayStatus } from './status';
import type { Customer, Dashboard, InvoiceSummary, StoredInvoiceStatus } from './types';

export type DashboardInvoice = {
  id: string;
  number: string;
  customerId: string;
  status: StoredInvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalCents: number;
  paidCents: number;
  updatedAt: string;
};

export type DashboardPayment = {
  amountCents: number;
  createdAt: string;
};

export function toSummary(invoice: DashboardInvoice, customerName: string, asOf: string): InvoiceSummary {
  const balanceCents = Math.max(invoice.totalCents - invoice.paidCents, 0);
  return {
    id: invoice.id,
    number: invoice.number,
    customerName,
    displayStatus: displayStatus(invoice.status, invoice.dueDate, asOf, balanceCents),
    totalCents: invoice.totalCents,
    balanceCents,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    issueDate: invoice.issueDate,
  };
}

export function buildDashboard(input: {
  currency: string;
  asOf: string;
  invoices: DashboardInvoice[];
  payments: DashboardPayment[];
  customers: Customer[];
}): Dashboard {
  const names = new Map(input.customers.map((customer) => [customer.id, customer.name]));
  const summaries = input.invoices.map((invoice) => ({
    invoice,
    summary: toSummary(invoice, names.get(invoice.customerId) ?? 'Customer', input.asOf),
  }));
  const open = summaries.filter(
    (item) => item.summary.balanceCents > 0 && item.invoice.status !== 'draft' && item.invoice.status !== 'void',
  );
  const month = monthKey(input.asOf);
  const collectedThisMonthCents = input.payments
    .filter((payment) => monthKey(payment.createdAt) === month)
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const monthly = recentMonths(input.asOf).map((bucket) => ({
    ...bucket,
    collectedCents: input.payments
      .filter((payment) => monthKey(payment.createdAt) === bucket.key)
      .reduce((sum, payment) => sum + payment.amountCents, 0),
  }));
  const attention = open
    .filter((item) => item.summary.displayStatus === 'overdue')
    .sort((a, b) => a.summary.dueDate.localeCompare(b.summary.dueDate))
    .slice(0, 3)
    .map((item) => item.summary);
  const recent = [...summaries]
    .sort((a, b) => b.invoice.updatedAt.localeCompare(a.invoice.updatedAt))
    .slice(0, 5)
    .map((item) => item.summary);

  return {
    currency: input.currency,
    periodLabel: periodLabel(input.asOf),
    asOf: input.asOf,
    collectedThisMonthCents,
    outstandingCents: open
      .filter((item) => item.summary.displayStatus !== 'overdue')
      .reduce((sum, item) => sum + item.summary.balanceCents, 0),
    overdueCents: open
      .filter((item) => item.summary.displayStatus === 'overdue')
      .reduce((sum, item) => sum + item.summary.balanceCents, 0),
    openCount: open.length,
    monthly,
    attention,
    recent,
  };
}
