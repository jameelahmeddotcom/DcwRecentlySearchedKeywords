import { describe, expect, it } from 'vitest';
import { authorized, customerId, keyword, pagination } from './validation.js';
describe('request validation', () => {
  it('checks secret and never accepts empty configuration', () => {
    expect(authorized({ SEARCH_API_KEY: 'secret', __ow_headers: { 'x-search-api-key': 'secret' } })).toBe(true);
    expect(authorized({ SEARCH_API_KEY: 'secret', __ow_headers: { 'x-search-api-key': 'other' } })).toBe(false);
    expect(authorized({ SEARCH_API_KEY: '', __ow_headers: { 'x-search-api-key': '' } })).toBe(false);
  });
  it('rejects invalid ids, keywords and pagination', () => {
    expect(customerId('3')).toBe(3); expect(customerId(0)).toBeNull();
    expect(keyword('  shoes  ')).toBe('shoes'); expect(keyword(' '.repeat(3))).toBeNull();
    expect(keyword('x'.repeat(256))).toBeNull();
    expect(pagination({ page: '2', pageSize: '5' })).toEqual({ page: 2, pageSize: 5 });
    expect(pagination({ page: 0 })).toBeNull(); expect(pagination({ pageSize: 21 })).toBeNull();
  });
});
