export function normalizeAmount(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.round(value);

  const str = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\$/g, '')
    .replace(/,/g, '.');

  if (str.endsWith('k')) return Math.round(parseFloat(str) * 1000);
  if (str.includes('mil')) return Math.round(parseFloat(str.replace('mil', '')) * 1000);
  if (str.endsWith('m')) return Math.round(parseFloat(str) * 1_000_000);

  const num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? null : Math.round(num);
}