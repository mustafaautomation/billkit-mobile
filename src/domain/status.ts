import type { DisplayStatus, InvoiceFilter, InvoiceSummary, StoredInvoiceStatus } from './types';

export function displayStatus(
  status: StoredInvoiceStatus,
  dueDate: string,
  asOf: string,
  balanceCents: number,
): DisplayStatus {
  if (status === 'paid' || status === 'void' || status === 'draft') return status;
  if (balanceCents > 0 && dueDate < asOf) return 'overdue';
  return status;
}

export function matchesFilter(summary: InvoiceSummary, status: StoredInvoiceStatus, filter: InvoiceFilter): boolean {
  if (filter === 'all') return status !== 'void';
  if (filter === 'draft') return status === 'draft';
  if (filter === 'paid') return summary.displayStatus === 'paid';
  if (filter === 'overdue') return summary.displayStatus === 'overdue';
  return summary.balanceCents > 0 && status !== 'draft' && status !== 'void';
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  partial: 'Partial',
  paid: 'Paid',
  void: 'Void',
  overdue: 'Overdue',
};
