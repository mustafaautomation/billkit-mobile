import { formatMoney, dollarsToCents } from './money';
import { priceLines, parseQuantity, parseTaxRate } from './invoiceMath';
import { displayStatus, matchesFilter } from './status';
import { canSendInvoice, canViewDashboard } from './permissions';
import { buildDashboard } from './dashboard';
import { createSeed } from '../data/seed';
import { DEMO_AS_OF } from './types';
import type { InvoiceSummary } from './types';

describe('money', () => {
  it('formats stable currency strings', () => {
    expect(formatMoney(1345400, 'USD')).toBe('$13,454.00');
    expect(formatMoney(566370, 'USD')).toBe('$5,663.70');
    expect(formatMoney(118080, 'EUR')).toBe('€1,180.80');
    expect(formatMoney(-250, 'USD')).toBe('-$2.50');
  });

  it('parses dollar input into cents', () => {
    expect(dollarsToCents('1,250.50')).toBe(125050);
    expect(dollarsToCents('8')).toBe(800);
    expect(dollarsToCents('nope')).toBeNull();
  });
});

describe('invoice math', () => {
  it('prices quantity, tax, and total in cents', () => {
    expect(priceLines([{ description: 'Hours', quantity: 40, unitAmountCents: 15000 }], 8.5)).toEqual({
      subtotalCents: 600000,
      taxCents: 51000,
      totalCents: 651000,
    });
    expect(parseQuantity('1.5')).toBe(1.5);
    expect(parseQuantity('0')).toBeNull();
    expect(parseTaxRate('8.5')).toBe(8.5);
    expect(parseTaxRate('101')).toBeNull();
  });
});

describe('status', () => {
  const summary = (patch: Partial<InvoiceSummary>): InvoiceSummary => ({
    id: 'inv',
    number: 'INV-1',
    customerName: 'Ada',
    displayStatus: 'sent',
    totalCents: 1000,
    balanceCents: 1000,
    currency: 'USD',
    dueDate: '2026-12-01',
    issueDate: '2026-11-01',
    ...patch,
  });

  it('marks past-due open invoices as overdue and keeps paid invoices paid', () => {
    expect(displayStatus('sent', '2026-10-28', DEMO_AS_OF, 100)).toBe('overdue');
    expect(displayStatus('sent', '2026-11-25', DEMO_AS_OF, 100)).toBe('sent');
    expect(displayStatus('paid', '2026-10-01', DEMO_AS_OF, 0)).toBe('paid');
    expect(matchesFilter(summary({ displayStatus: 'overdue' }), 'sent', 'overdue')).toBe(true);
    expect(matchesFilter(summary({ displayStatus: 'draft', balanceCents: 100 }), 'draft', 'unpaid')).toBe(false);
  });
});

describe('permissions', () => {
  it('keeps viewers out of the dashboard and sending', () => {
    expect(canViewDashboard('owner')).toBe(true);
    expect(canViewDashboard('accountant')).toBe(true);
    expect(canViewDashboard('viewer')).toBe(false);
    expect(canSendInvoice('member')).toBe(false);
    expect(canSendInvoice('admin')).toBe(true);
  });
});

describe('dashboard', () => {
  it('totals the Northwind November ledger', () => {
    const db = createSeed();
    const dashboard = buildDashboard({
      currency: 'USD',
      asOf: DEMO_AS_OF,
      customers: db.customers,
      payments: db.payments
        .filter((payment) => payment.organizationId === 'org_northwind')
        .map((payment) => ({ amountCents: payment.amountCents, createdAt: payment.createdAt })),
      invoices: db.invoices
        .filter((invoice) => invoice.organizationId === 'org_northwind')
        .map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          customerId: invoice.customerId,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          totalCents: invoice.totalCents,
          paidCents: db.payments
            .filter((payment) => payment.invoiceId === invoice.id)
            .reduce((sum, payment) => sum + payment.amountCents, 0),
          updatedAt: invoice.updatedAt,
        })),
    });
    expect(dashboard.collectedThisMonthCents).toBe(1445400);
    expect(dashboard.overdueCents).toBe(566370);
    expect(dashboard.outstandingCents).toBe(655160);
    expect(dashboard.attention.map((item) => item.number)).toEqual(['INV-1042', 'INV-1051']);
    expect(dashboard.periodLabel).toBe('November 2026');
  });
});
