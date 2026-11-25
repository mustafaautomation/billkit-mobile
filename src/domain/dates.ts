const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function periodLabel(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export function recentMonths(isoDate: string, count = 6): { key: string; label: string }[] {
  const [year, month] = isoDate.split('-').map(Number);
  const start = year * 12 + (month - 1) - (count - 1);
  const months: { key: string; label: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    const cursor = start + index;
    const cursorYear = Math.floor(cursor / 12);
    const cursorMonth = cursor % 12;
    months.push({
      key: `${cursorYear}-${String(cursorMonth + 1).padStart(2, '0')}`,
      label: MONTHS_SHORT[cursorMonth],
    });
  }
  return months;
}

export function atDemoTime(isoDate: string, hours = 16): string {
  return `${isoDate}T${String(hours).padStart(2, '0')}:00:00.000Z`;
}
