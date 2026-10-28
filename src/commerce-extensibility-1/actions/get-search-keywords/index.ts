import { randomUUID } from 'node:crypto';
import { authorized, customerId, pagination, preflight, response } from '../utils/validation.js';
import { failure, retry, withDatabase } from '../utils/database.js';

export async function main(params: Record<string, unknown>) {
  const trace = randomUUID();
  const reply = (status: number, body: unknown) => ({ ...response(status, body), headers: { ...response(status, body).headers, 'x-request-id': trace } });
  const options = preflight(params);
  if (options) return options;
  if (params.__ow_method !== 'get') return reply(405, { error: 'method_not_allowed' });
  if (!authorized(params)) return reply(401, { error: 'unauthorized' });
  const id = customerId(params.customerId);
  const paging = pagination(params);
  if (id === null || !paging) return reply(400, { error: 'invalid_input' });
  try {
    const result = await withDatabase(params, trace, async (client) => {
      const collection = client.collection('search_keywords');
      const filter = { customerId: id };
      const totalCount = await retry(() => collection.countDocuments(filter));
      const documents = await retry(() => collection.find(filter).sort({ searchedAt: -1, _id: -1 }).skip((paging.page - 1) * paging.pageSize).limit(paging.pageSize).project({ _id: 0, customerId: 1, keyword: 1, searchedAt: 1 }).toArray());
      return { items: documents.map((doc) => ({ customerId: doc.customerId, keyword: doc.keyword, searchedAt: doc.searchedAt })), ...paging, totalCount };
    });
    return reply(200, result);
  } catch (error) { return reply(failure(error), { error: 'storage_error' }); }
}
