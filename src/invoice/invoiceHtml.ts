import { formatLongDate } from '../domain/dates';
import { formatMoney } from '../domain/money';
import type { InvoiceDetail, Organization } from '../domain/types';

export function invoiceHtml(invoice: InvoiceDetail, organization: Organization): string {
  const rows = invoice.lines
    .map(
      (line) => `<tr>
        <td>${escapeHtml(line.description)}<div class="muted">${line.quantity} × ${formatMoney(line.unitAmountCents, invoice.currency)}</div></td>
        <td class="num">${formatMoney(line.amountCents, invoice.currency)}</td>
      </tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.number)}</title>
    <style>
      body { font-family: Georgia, serif; color: #1c1915; margin: 32px; }
      h1 { font-weight: 600; margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      td { border-top: 1px solid #e4d9c6; padding: 8px 0; vertical-align: top; }
      .num { text-align: right; }
      .muted { color: #3e4c4a; font-family: sans-serif; font-size: 12px; }
      .totals { margin-top: 16px; width: 240px; margin-left: auto; }
    </style></head><body>
    <h1>${escapeHtml(organization.name)}</h1>
    <p>${escapeHtml(organization.addressLine1)}<br>${escapeHtml(organization.email)}</p>
    <h2>${escapeHtml(invoice.number)}</h2>
    <p>Bill to ${escapeHtml(invoice.customer.name)}<br>Issued ${formatLongDate(invoice.issueDate)} · Due ${formatLongDate(invoice.dueDate)}</p>
    <table>${rows}</table>
    <div class="totals">
      <p>Subtotal ${formatMoney(invoice.subtotalCents, invoice.currency)}</p>
      <p>${escapeHtml(organization.taxLabel)} ${formatMoney(invoice.taxCents, invoice.currency)}</p>
      <p><strong>Total ${formatMoney(invoice.totalCents, invoice.currency)}</strong></p>
      <p><strong>Balance ${formatMoney(invoice.balanceCents, invoice.currency)}</strong></p>
    </div>
    <p>${escapeHtml(invoice.notes)}</p>
    </body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
