import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../utils/database.js', () => ({ withDatabase: vi.fn(), retry: (f: () => Promise<unknown>) => f(), failure: () => 502 }));
import { withDatabase } from '../utils/database.js';
import { main } from './index.js';
const base = { __ow_method: 'get', SEARCH_API_KEY: 'secret', __ow_headers: { 'x-search-api-key': 'secret' }, customerId: '12', pageSize: '5' };
beforeEach(() => vi.clearAllMocks());
describe('get action', () => {
  it('returns sorted paginated records', async () => {
    const filter = vi.fn();
    vi.mocked(withDatabase).mockImplementation(async (_p, _t, work) => work({ collection: () => ({ countDocuments: async () => 1, find: filter.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ project: () => ({ toArray: async () => [{ customerId: 12, keyword: 'boots', searchedAt: '2026-10-28T00:00:00Z' }] }) }) }) }) }) }) } as never));
    const result = await main(base);
    expect(result.body).toMatchObject({ page: 1, pageSize: 5, totalCount: 1, items: [{ keyword: 'boots' }] });
    expect(filter).toHaveBeenCalledWith({ customerId: 12 });
  });
  it('rejects unauthorized and invalid requests', async () => {
    expect((await main({ ...base, __ow_headers: {} })).statusCode).toBe(401);
    expect((await main({ ...base, pageSize: '21' })).statusCode).toBe(400);
  });
  it('handles DB errors', async () => {
    vi.mocked(withDatabase).mockRejectedValue(new Error('down'));
    expect((await main(base)).statusCode).toBe(502);
  });
});
