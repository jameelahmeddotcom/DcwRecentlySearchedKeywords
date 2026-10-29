import { timingSafeEqual } from 'node:crypto';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-search-api-key',
};
export function response(statusCode: number, body: unknown) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }, body };
}
export function preflight(params: Record<string, unknown>) {
  return String(params.__ow_method ?? '').toLowerCase() === 'options'
    ? { statusCode: 204, headers: cors, body: '' }
    : null;
}
export function authorized(params: Record<string, unknown>): boolean {
  const headers = params.__ow_headers;
  const supplied = headers && typeof headers === 'object' ? (headers as Record<string, unknown>)['x-search-api-key'] : undefined;
  const expected = params.SEARCH_API_KEY;
  if (typeof supplied !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = Buffer.from(supplied); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function customerId(value: unknown): number | null {
  const n = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : null;
}
export function customerEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255 ? email : null;
}
export function ownerFilter(id: number | null, email: string | null): Record<string, unknown> | null {
  const clauses: Record<string, unknown>[] = [];
  if (id !== null) clauses.push({ customerId: id });
  if (email) clauses.push({ customerEmail: email });
  if (!clauses.length) return null;
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}
export function keyword(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= 255 ? cleaned : null;
}
export function pagination(params: Record<string, unknown>, defaultSize = 20) {
  const parse = (value: unknown, fallback: number) => value === undefined ? fallback :
    (typeof value === 'number' || typeof value === 'string' && /^[1-9]\d*$/.test(value)) ? Number(value) : NaN;
  const page = parse(params.page, 1); const pageSize = parse(params.pageSize, defaultSize);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 20 || (page - 1) * pageSize > Number.MAX_SAFE_INTEGER) return null;
  return { page, pageSize };
}
export function bodyParams(params: Record<string, unknown>): Record<string, unknown> | null {
  if (params.__ow_body === undefined) return params;
  try {
    const body: unknown = typeof params.__ow_body === 'string' ? JSON.parse(params.__ow_body) : params.__ow_body;
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
}
