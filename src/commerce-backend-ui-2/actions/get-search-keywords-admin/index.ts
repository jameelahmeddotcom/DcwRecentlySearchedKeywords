import { randomUUID } from 'node:crypto';
import { customerEmail, customerId, pagination, response } from '../../../commerce-extensibility-1/actions/utils/validation.js';
import { failure, retry, withDatabase } from '../../../commerce-extensibility-1/actions/utils/database.js';

export async function main(params: Record<string, unknown>) {
  const trace = randomUUID();
  const reply = (status: number, body: unknown) => ({ ...response(status, body), headers: { ...response(status, body).headers, 'x-request-id': trace } });
  if (params.__ow_method !== 'get') return reply(405, { error: 'method_not_allowed' });
  // Runtime's require-adobe-auth annotation verifies IMS at the gateway before invocation.
  const paging = pagination(params, 20, 100);
  const raw = params.customerId;
  const email = typeof raw === 'string' ? customerEmail(raw) : null;
  const guest = typeof raw === 'string' && raw.trim().toLowerCase() === 'guest';
  const id = raw === undefined || raw === '' ? undefined : customerId(raw);
  const sortFields = { customer: 'customerEmail', keyword: 'keyword', searchedAt: 'searchedAt' } as const;
  const sortName = typeof params.sort === 'string' && params.sort in sortFields ? params.sort as keyof typeof sortFields : 'searchedAt';
  const direction = params.dir === 'asc' ? 1 : -1;
  if (!paging || (raw !== undefined && raw !== '' && id === null && !email && !guest)) return reply(400, { error: 'invalid_input' });
  try {
    const result = await withDatabase(params, trace, async (client) => {
      const collection = client.collection('search_keywords');
      const keywordTerm = typeof params.keyword === 'string' ? params.keyword.trim().slice(0, 255) : '';
      const keywordClause = keywordTerm
        ? { keyword: { $regex: keywordTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
        : null;
      const owner = guest ? { guest: true } : email ? { customerEmail: email } : id === undefined ? {} : { customerId: id };
      const filter = keywordClause ? { ...owner, ...keywordClause } : owner;
      const totalCount = await retry(() => collection.countDocuments(filter));
      const documents = await retry(() => collection.find(filter).sort({ [sortFields[sortName]]: direction, _id: direction }).skip((paging.page - 1) * paging.pageSize).limit(paging.pageSize).project({ _id: 0, customerId: 1, customerEmail: 1, guest: 1, keyword: 1, searchedAt: 1 }).toArray());
      return { items: documents.map((doc) => ({ customerId: doc.customerId, customerEmail: doc.customerEmail, guest: doc.guest === true, keyword: doc.keyword, searchedAt: doc.searchedAt })), ...paging, totalCount };
    });
    return reply(200, result);
  } catch (error) { return reply(failure(error), { error: 'storage_error' }); }
}
