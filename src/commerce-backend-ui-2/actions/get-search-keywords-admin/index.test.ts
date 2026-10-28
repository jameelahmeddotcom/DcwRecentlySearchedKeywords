import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../commerce-extensibility-1/actions/utils/database.js', () => ({ withDatabase: vi.fn(), retry: (f: () => Promise<unknown>) => f(), failure: () => 502 }));
import { withDatabase } from '../../../commerce-extensibility-1/actions/utils/database.js';
import { main } from './index.js';
beforeEach(() => vi.clearAllMocks());
describe('admin read action', () => {
  it('delegates unauthenticated requests to the IMS gateway before invocation', () => {
    const manifest = readFileSync(new URL('../../ext.config.yaml', import.meta.url), 'utf8');
    expect(manifest).toMatch(/get-search-keywords-admin:[\s\S]*require-adobe-auth: true/);
    expect(manifest).toMatch(/get-search-keywords-admin:[\s\S]*include-ims-credentials: true/);
    expect(manifest).toMatch(/get-search-keywords-admin:[\s\S]*final: true/);
  });
  it.each([undefined, '12'])('paginates with customer filter %s', async (customerId) => {
    const find = vi.fn().mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ project: () => ({ toArray: async () => [{ customerId: 12, keyword: 'boots', searchedAt: '2026-10-28T00:00:00Z' }] }) }) }) }) });
    vi.mocked(withDatabase).mockImplementation(async (_p, _t, work) => work({ collection: () => ({ countDocuments: async () => 1, find }) } as never));
    const result = await main({ __ow_method: 'get', customerId, page: '2' });
    expect(result.body).toMatchObject({ page: 2, pageSize: 20, totalCount: 1, items: [{ keyword: 'boots' }] });
    expect(find).toHaveBeenCalledWith(customerId ? { customerId: 12 } : {});
  });
  it('rejects bad method, pagination and customer ID', async () => {
    expect((await main({ __ow_method: 'post' })).statusCode).toBe(405);
    expect((await main({ __ow_method: 'get', pageSize: 50 })).statusCode).toBe(400);
    expect((await main({ __ow_method: 'get', customerId: '-2' })).statusCode).toBe(400);
  });
  it('responds to database failure without leaking details', async () => {
    vi.mocked(withDatabase).mockRejectedValue(new Error('credentials'));
    const result = await main({ __ow_method: 'get' });
    expect(result.statusCode).toBe(502);
    expect(result.body).toEqual({ error: 'storage_error' });
  });
});
