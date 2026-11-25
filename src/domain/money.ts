const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatMoney(cents: number, currency = 'USD'): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `;
  return `${sign}${symbol}${grouped}.${remainder.toString().padStart(2, '0')}`;
}

export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,€£\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [dollars, fraction = ''] = cleaned.split('.');
  const cents = `${fraction}00`.slice(0, 2);
  return Number(dollars) * 100 + Number(cents);
}

export function centsToInput(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return remainder === 0 ? String(dollars) : `${dollars}.${remainder.toString().padStart(2, '0')}`;
}
