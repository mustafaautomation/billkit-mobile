import type { InvoiceLineInput } from './types';

export function lineAmountCents(quantity: number, unitAmountCents: number): number {
  return Math.round(quantity * unitAmountCents);
}

export function taxCents(subtotalCents: number, taxRatePercent: number): number {
  return Math.round(subtotalCents * (taxRatePercent / 100));
}

export function priceLines(
  lines: InvoiceLineInput[],
  taxRatePercent: number,
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + lineAmountCents(line.quantity, line.unitAmountCents),
    0,
  );
  const tax = taxCents(subtotalCents, taxRatePercent);
  return { subtotalCents, taxCents: tax, totalCents: subtotalCents + tax };
}

export function parseQuantity(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const quantity = Number(trimmed);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return null;
  return quantity;
}

export function parseTaxRate(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return null;
  const rate = Number(trimmed);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return null;
  return rate;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeCardNumber(value: string): string {
  return value.replace(/\s+/g, '');
}
