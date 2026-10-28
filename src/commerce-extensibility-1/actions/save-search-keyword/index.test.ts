import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@adobe/aio-lib-state', () => ({ init: vi.fn() }));
vi.mock('../utils/database.js', () => ({ withDatabase: vi.fn(), retry: (f: () => Promise<unknown>) => f(), failure: () => 502 }));
import { init } from '@adobe/aio-lib-state';
import { withDatabase } from '../utils/database.js';
import { main } from './index.js';
const base = { __ow_method: 'post', SEARCH_API_KEY: 'secret', __ow_headers: { 'x-search-api-key': 'secret' }, __ow_body: JSON.stringify({ customerId: 12, keyword: ' boots ' }) };
beforeEach(() => vi.clearAllMocks());
describe('save action', () => {
  it('inserts and prunes after the last 100', async () => {
    vi.mocked(init).mockResolvedValue({ put: vi.fn().mockResolvedValue('claimed') } as never);
    const insertOne = vi.fn(); const deleteOne = vi.fn();
    vi.mocked(withDatabase).mockImplementation(async (_p, _t, work) => work({ collection: () => ({ insertOne, find: () => ({ sort: () => ({ skip: () => ({ project: () => ({ toArray: async () => [{ _id: 'old' }] }) }) }) }), deleteOne }) } as never));
    const result = await main(base);
    expect(result.statusCode).toBe(201);
    expect(insertOne).toHaveBeenCalledWith(expect.objectContaining({ customerId: 12, keyword: 'boots' }));
    expect(deleteOne).toHaveBeenCalledWith({ _id: 'old', customerId: 12 });
  });
  it('rejects unauthenticated and invalid requests', async () => {
    expect((await main({ ...base, __ow_headers: {} })).statusCode).toBe(401);
    expect((await main({ ...base, __ow_body: '{}' })).statusCode).toBe(400);
  });
  it('reports storage errors', async () => {
    vi.mocked(init).mockRejectedValue(new Error('down'));
    expect((await main(base)).statusCode).toBe(502);
  });
});
