import { useEffect, useState } from 'react';
import { useIms } from '@adobe/aio-commerce-lib-admin-ui/web';
import { useConfig } from '../hooks/use-config.js';

type Item = { customerId?: number; customerEmail?: string; guest?: boolean; keyword: string; searchedAt: string };
type Page = { items: Item[]; page: number; pageSize: number; totalCount: number };
export function MainPage() {
  const { data: ims, error: imsError } = useIms();
  const { getActionUrl } = useConfig();
  const [customerFilter, setCustomerFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ims?.imsToken || !ims?.imsOrgId) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    const url = new URL(getActionUrl('search-history-admin/get-search-keywords-admin'));
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', '20');
    if (appliedFilter) url.searchParams.set('customerId', appliedFilter);
    fetch(url, { signal: controller.signal, headers: { authorization: `Bearer ${ims.imsToken}`, 'x-gw-ims-org-id': ims.imsOrgId } })
      .then(async (response) => { if (!response.ok) throw new Error(`Request failed (${response.status})`); return response.json() as Promise<Page>; })
      .then((value) => { if (!controller.signal.aborted) { setResult(value); setLoading(false); } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'Could not load search history'); setLoading(false); } });
    return () => controller.abort();
  }, [ims?.imsToken, ims?.imsOrgId, getActionUrl, page, appliedFilter]);
  const pages = Math.max(1, Math.ceil((result?.totalCount ?? 0) / 20));
  return <main style={{ padding: 24 }}>
    <h1>Search Keyword History</h1>
    <form onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedFilter(customerFilter.trim()); }}>
      <label htmlFor="customer-filter">Customer ID or email </label>
      <input id="customer-filter" value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)} />
      <button type="submit">Filter</button>
    </form>
    {imsError && <p role="alert">Admin authentication unavailable.</p>}
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Loading…</p>}
    <table style={{ width: '100%', textAlign: 'left', marginTop: 16 }}>
      <thead><tr><th scope="col">Customer</th><th scope="col">Keyword</th><th scope="col">Date</th></tr></thead>
      <tbody>{result?.items.map((item, index) => <tr key={`${item.customerEmail || item.customerId}-${item.searchedAt}-${index}`}><td>{item.customerEmail || item.customerId || (item.guest ? 'Guest' : '')}</td><td>{item.keyword}</td><td>{new Date(item.searchedAt).toLocaleString()}</td></tr>)}</tbody>
    </table>
    {!loading && result?.items.length === 0 && <p>No search keywords found.</p>}
    <nav aria-label="Search history pages" style={{ marginTop: 16 }}>
      <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
      <span> Page {page} of {pages} ({result?.totalCount ?? 0} searches) </span>
      <button type="button" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</button>
    </nav>
  </main>;
}
