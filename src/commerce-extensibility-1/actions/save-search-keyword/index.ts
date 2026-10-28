import { createHash, randomUUID } from 'node:crypto';
import { init as initState } from '@adobe/aio-lib-state';
import { authorized, bodyParams, customerId, keyword, preflight, response } from '../utils/validation.js';
import { failure, retry, withDatabase } from '../utils/database.js';

export async function main(params: Record<string, unknown>) {
  const trace = randomUUID();
  const headers = { 'x-request-id': trace };
  const reply = (status: number, body: unknown) => ({ ...response(status, body), headers: { ...response(status, body).headers, ...headers } });
  const options = preflight(params);
  if (options) return options;
  if (params.__ow_method !== 'post') return reply(405, { error: 'method_not_allowed' });
  if (!authorized(params)) return reply(401, { error: 'unauthorized' });
  const body = bodyParams(params);
  const id = customerId(body?.customerId); const term = keyword(body?.keyword);
  if (id === null || term === null) return reply(400, { error: 'invalid_input' });
  const key = `search.${id}.${createHash('sha256').update(term).digest('hex')}`;
  let state: Awaited<ReturnType<typeof initState>> | undefined;
  let claimed = false;
  try {
    state = await initState({ region: 'amer' });
    claimed = (await state.put(key, JSON.stringify({ trace }), { ttl: 5, ifNotExists: true })) !== null;
    if (!claimed) return reply(200, { saved: false, duplicate: true });
    const searchedAt = new Date().toISOString();
    await withDatabase(params, trace, async (client) => {
      const write = async () => {
        const collection = client.collection('search_keywords');
        await retry(() => collection.insertOne({ customerId: id, keyword: term, searchedAt }));
        const stale = await retry(() => collection.find({ customerId: id }).sort({ searchedAt: -1, _id: -1 }).skip(100).project({ _id: 1 }).toArray());
        for (const doc of stale) await retry(() => collection.deleteOne({ _id: doc._id, customerId: id }));
      };
      try {
        await write();
      } catch (error) {
        const names = await client.listCollections();
        if (!names.some((entry) => entry.name === 'search_keywords')) {
          await client.createCollection('search_keywords');
          await client.collection('search_keywords').createIndex({ customerId: 1 });
          await write();
          return;
        }
        throw error;
      }
    });
    return reply(201, { saved: true, searchedAt });
  } catch (error) {
    console.error('save search failure', { trace, phase: 'save', errorType: error instanceof Error ? error.name : 'UnknownError', customerId: id });
    // A failed write must not suppress a legitimate immediate retry.
    if (claimed && state) try { await state.delete(key); } catch { /* claim expires after five seconds */ }
    return reply(failure(error), { error: 'storage_error' });
  }
}
