import { useEffect, useState } from 'react';
import type { SortDescriptor } from '@react-spectrum/s2';
import {
  Button,
  Cell,
  Column,
  Content,
  Heading,
  IllustratedMessage,
  InlineAlert,
  Picker,
  PickerItem,
  Row,
  SearchField,
  TableBody,
  TableHeader,
  TableView,
  Text,
} from '@react-spectrum/s2';
import NoSearchResults from '@react-spectrum/s2/illustrations/linear/NoSearchResults';
import { useIms } from '@adobe/aio-commerce-lib-admin-ui/web';
import { useConfig } from '../hooks/use-config.js';

type Item = {
  id: string;
  customer: string;
  keyword: string;
  date: string;
};
type Page = {
  items: Array<{ customerId?: number; customerEmail?: string; guest?: boolean; keyword: string; searchedAt: string }>;
  page: number;
  pageSize: number;
  totalCount: number;
};

const PAGE_SIZES = [20, 50, 100];

function customerLabel(item: Page['items'][number]) {
  if (item.customerEmail) return item.customerEmail;
  if (item.customerId) return String(item.customerId);
  return item.guest ? 'Guest' : '';
}

export function MainPage() {
  const { data: ims, error: imsError } = useIms();
  const { getActionUrl } = useConfig();
  const [customerFilter, setCustomerFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortDescriptor>({ column: 'searchedAt', direction: 'descending' });
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
    url.searchParams.set('sort', String(sort.column));
    url.searchParams.set('dir', sort.direction === 'ascending' ? 'asc' : 'desc');
    if (appliedFilter) url.searchParams.set('customerId', appliedFilter);
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
  }, [ims?.imsToken, ims?.imsOrgId, getActionUrl, page, pageSize, appliedFilter, sort]);

  const total = result?.totalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const rows: Item[] = (result?.items ?? []).map((item, index) => ({
    id: `${customerLabel(item)}-${item.searchedAt}-${index}`,
    customer: customerLabel(item),
    keyword: item.keyword,
    date: new Date(item.searchedAt).toLocaleString(),
  }));

  function applyFilter(value: string) {
    setPage(1);
    setAppliedFilter(value.trim());
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100vh', boxSizing: 'border-box', padding: 24 }}>
      <Heading level={1}>Search Keyword History</Heading>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
        <SearchField
          label="Customer"
          placeholder="ID, email, or Guest"
          value={customerFilter}
          onChange={(value) => {
            setCustomerFilter(value);
            if (!value.trim()) applyFilter('');
          }}
          onSubmit={applyFilter}
        />
        <Button variant="secondary" onPress={() => applyFilter(customerFilter)}>Filter</Button>
      </div>
      {imsError && (
        <InlineAlert variant="negative">
          <Heading>Admin authentication unavailable.</Heading>
        </InlineAlert>
      )}
      {error && (
        <InlineAlert variant="negative">
          <Heading>Could not load search history</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}
      <TableView
        aria-label="Search keyword history"
        density="compact"
        overflowMode="wrap"
        sortDescriptor={sort}
        onSortChange={(descriptor) => {
          setSort(descriptor);
          setPage(1);
        }}
        loadingState={loading ? 'loading' : 'idle'}
        UNSAFE_style={{ width: '100%', height: 'calc(100vh - 240px)', minHeight: 320 }}
      >
        <TableHeader>
          <Column id="customer" isRowHeader allowsSorting width={280}>Customer</Column>
          <Column id="keyword" allowsSorting>Keyword</Column>
          <Column id="searchedAt" allowsSorting width={220}>Date</Column>
        </TableHeader>
        <TableBody
          items={rows}
          renderEmptyState={() => (
            <IllustratedMessage size="S">
              <NoSearchResults />
              <Heading>No search keywords found</Heading>
              <Content>Searches from the storefront will appear in this grid.</Content>
            </IllustratedMessage>
          )}
        >
          {(item) => (
            <Row>
              <Cell>{item.customer}</Cell>
              <Cell>{item.keyword}</Cell>
              <Cell>{item.date}</Cell>
            </Row>
          )}
        </TableBody>
      </TableView>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Text>{total} records found</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Picker
            label="Per page"
            selectedKey={String(pageSize)}
            onSelectionChange={(key) => {
              setPageSize(Number(key));
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((size) => <PickerItem key={size} id={String(size)}>{size}</PickerItem>)}
          </Picker>
          <Button variant="secondary" isDisabled={page <= 1 || loading} onPress={() => setPage(page - 1)}>Previous</Button>
          <Text>{page} of {pages}</Text>
          <Button variant="secondary" isDisabled={page >= pages || loading} onPress={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </main>
  );
}
