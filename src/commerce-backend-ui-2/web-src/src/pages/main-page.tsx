import { useEffect, useState } from 'react';
import { useIms } from '@adobe/aio-commerce-lib-admin-ui/web';
import { useConfig } from '../hooks/use-config.js';
import './main-page.css';

type ColumnId = 'customer' | 'keyword' | 'searchedAt';
type Row = { customerId?: number; customerEmail?: string; guest?: boolean; keyword: string; searchedAt: string };
type Page = { items: Row[]; page: number; pageSize: number; totalCount: number };

const COLUMNS: Array<{ id: ColumnId; label: string }> = [
  { id: 'customer', label: 'Customer' },
  { id: 'keyword', label: 'Keyword' },
  { id: 'searchedAt', label: 'Date' },
];
const PAGE_SIZES = [20, 30, 50, 100];

function customerLabel(item: Row) {
  if (item.customerEmail) return item.customerEmail;
  if (item.customerId) return String(item.customerId);
  return item.guest ? 'Guest' : '';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date).replace(/,([^,]*)$/, '$1');
}

export function MainPage() {
  const { data: ims, error: imsError } = useIms();
  const { getActionUrl } = useConfig();
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [customer, setCustomer] = useState('');
  const [appliedCustomer, setAppliedCustomer] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visible, setVisible] = useState<Record<ColumnId, boolean>>({ customer: true, keyword: true, searchedAt: true });
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pageSize, setPageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<ColumnId>('searchedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ims?.imsToken || !ims?.imsOrgId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const url = new URL(getActionUrl('search-history-admin/get-search-keywords-admin'));
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('sort', sortColumn);
    url.searchParams.set('dir', sortDir);
    if (appliedKeyword) url.searchParams.set('keyword', appliedKeyword);
    if (appliedCustomer) url.searchParams.set('customerId', appliedCustomer);
    fetch(url, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${ims.imsToken}`, 'x-gw-ims-org-id': ims.imsOrgId },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json() as Promise<Page>;
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          setResult(value);
          setPageInput(String(value.page));
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load search history');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [ims?.imsToken, ims?.imsOrgId, getActionUrl, page, pageSize, appliedKeyword, appliedCustomer, sortColumn, sortDir]);

  const total = result?.totalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const shown = COLUMNS.filter((column) => visible[column.id]);
  const filterCount = appliedCustomer ? 1 : 0;

  function search(value: string) {
    setPage(1);
    setAppliedKeyword(value.trim());
  }

  function sortBy(column: ColumnId) {
    setPage(1);
    if (sortColumn === column) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortColumn(column);
      setSortDir('asc');
    }
  }

  function goToPage(value: string) {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 1 || next > pages) {
      setPageInput(String(page));
      return;
    }
    setPage(next);
  }

  return (
    <main className="admin-grid">
      <h1 className="admin-grid__title">Search Keyword History</h1>
      {imsError && <p className="admin-grid__message" role="alert">Admin authentication unavailable.</p>}
      {error && <p className="admin-grid__message" role="alert">{error}</p>}
      <div className="admin-grid__toolbar">
        <form className="admin-grid__search" onSubmit={(event) => { event.preventDefault(); search(keyword); }}>
          <input
            aria-label="Search by keyword"
            placeholder="Search by keyword"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              if (!event.target.value.trim()) search('');
            }}
          />
          <button type="submit" aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5 L14 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </form>
        <div className="admin-grid__tools">
          <button type="button" className="admin-grid__action" aria-expanded={filtersOpen} onClick={() => { setFiltersOpen(!filtersOpen); setColumnsOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 3h12l-4.5 5.2V13l-3 1.2V8.2L2 3z" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            Filters{filterCount ? ` (${filterCount})` : ''}
          </button>
          <div className="admin-grid__menu-wrap">
            <button type="button" className="admin-grid__action" aria-expanded={columnsOpen} onClick={() => { setColumnsOpen(!columnsOpen); setFiltersOpen(false); }}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M3.8 12.2l1.1-1.1M11.1 4.9l1.1-1.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Columns
            </button>
            {columnsOpen && (
              <div className="admin-grid__menu" role="group" aria-label="Columns">
                {COLUMNS.map((column) => (
                  <label key={column.id}>
                    <input
                      type="checkbox"
                      checked={visible[column.id]}
                      onChange={() => {
                        const enabled = shown.length;
                        if (visible[column.id] && enabled === 1) return;
                        setVisible({ ...visible, [column.id]: !visible[column.id] });
                      }}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {filtersOpen && (
        <form
          className="admin-grid__filters"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedCustomer(customer.trim());
          }}
        >
          <label>
            Customer
            <input
              value={customer}
              placeholder="ID, email, or Guest"
              onChange={(event) => setCustomer(event.target.value)}
            />
          </label>
          <button type="submit">Apply Filters</button>
          <button
            type="button"
            onClick={() => {
              setCustomer('');
              setAppliedCustomer('');
              setPage(1);
            }}
          >
            Clear all
          </button>
        </form>
      )}
      <div className="admin-grid__controls">
        <p className="admin-grid__count">{loading && !result ? 'Loading…' : `${total} records found`}</p>
        <div className="admin-grid__pager">
          <select
            aria-label="Per page"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>per page</span>
          <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>‹</button>
          <input
            aria-label="Current page"
            inputMode="numeric"
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onBlur={() => goToPage(pageInput)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') goToPage(pageInput);
            }}
          />
          <span>of {pages}</span>
          <button type="button" aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>›</button>
        </div>
      </div>
      <div className="admin-grid__table-wrap" data-loading={loading ? 'true' : 'false'}>
        <table>
          <thead>
            <tr>
              {shown.map((column) => (
                <th key={column.id} aria-sort={sortColumn === column.id ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => sortBy(column.id)}>
                    {column.label}
                    {sortColumn === column.id && <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && result?.items.length === 0 && (
              <tr>
                <td className="admin-grid__empty" colSpan={shown.length}>We couldn&apos;t find any records.</td>
              </tr>
            )}
            {result?.items.map((item, index) => (
              <tr key={`${customerLabel(item)}-${item.keyword}-${item.searchedAt}-${index}`}>
                {visible.customer && <td>{customerLabel(item)}</td>}
                {visible.keyword && <td>{item.keyword}</td>}
                {visible.searchedAt && <td>{formatDate(item.searchedAt)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
