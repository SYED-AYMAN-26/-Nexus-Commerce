import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, AdminToolbar } from '../../components/admin/AdminParts';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input, Select } from '../../components/ui/Form';
import { DataTable, Tabs } from '../../components/ui/Misc';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/Feedback';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../utils/constants';
import { formatDateTime, formatMoney, initials } from '../../utils/format';
import { useDebounce } from '../../hooks';

const dateInputValue = (value) => (value ? value.slice(0, 10) : '');

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const orderStatus = params.get('orderStatus') || '';
  const paymentStatus = params.get('paymentStatus') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const sort = params.get('sort') || 'newest';

  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.orders({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        orderStatus: orderStatus || undefined,
        paymentStatus: paymentStatus || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, orderStatus, paymentStatus, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === null) next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next, { replace: true });
  };

  const statusCounts = data?.statusCounts || {};
  const totalOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const tabs = [
    { value: '', label: 'All statuses', count: totalOrders },
    ...Object.entries(ORDER_STATUS).map(([value, meta]) => ({
      value,
      label: meta.label,
      count: statusCounts[value] || 0,
    })),
  ];

  const orders = data?.orders || [];
  const sorted = [...orders].sort((a, b) => {
    if (sort === 'total-desc') return b.total - a.total;
    if (sort === 'total-asc') return a.total - b.total;
    return 0;
  });

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (order) => (
        <div>
          <Link to={`/admin/orders/${order._id}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
            {order.orderNumber}
          </Link>
          <p className="mt-0.5 text-2xs text-ink-500">{formatDateTime(order.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-2xs font-bold text-ink-700">
            {initials(order.user?.name || order.shippingAddress?.fullName || 'G')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{order.user?.name || order.shippingAddress?.fullName}</p>
            <p className="truncate text-2xs text-ink-500">{order.user?.email || order.shippingAddress?.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((item) => (
              <img key={item._id} src={item.image} alt={item.name} className="h-8 w-8 rounded-md border-2 border-white object-cover" loading="lazy" />
            ))}
          </div>
          <span className="text-xs text-ink-500">{order.itemCount} pcs</span>
        </div>
      ),
    },
    {
      key: 'orderStatus',
      header: 'Status',
      render: (order) => (
        <div className="flex flex-col items-start gap-1.5">
          <OrderStatusBadge status={order.orderStatus} size="sm" />
          <PaymentStatusBadge status={order.paymentStatus} size="sm" />
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (order) => (
        <div>
          <p className="text-xs font-medium capitalize text-ink-800">{order.paymentMethod}</p>
          <p className="text-2xs uppercase text-ink-500">{order.paymentProvider}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (order) => (
        <div>
          <p className="text-sm font-bold text-ink-900">{formatMoney(order.total)}</p>
          {order.discount > 0 && <p className="text-2xs text-success-600">-{formatMoney(order.discount)}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (order) => (
        <div className="flex justify-end gap-1.5">
          <Button to={`/admin/orders/${order._id}`} size="sm" variant="outline">
            Manage
          </Button>
          <Button href={`/api/orders/${order._id}/invoice`} size="sm" variant="ghost" aria-label="Download invoice">
            <Icon name="receipt" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Search, filter and fulfil every order. Status changes are written to the order audit trail."
        actions={
          <>
            <Button variant="outline" href="/api/admin/export/orders.csv" icon={<Icon name="send" className="h-4 w-4" />}>
              Export CSV
            </Button>
            <Button to="/admin/inventory" variant="ghost" icon={<Icon name="warehouse" className="h-4 w-4" />}>
              Inventory
            </Button>
          </>
        }
      />

      <Tabs tabs={tabs} value={orderStatus} onChange={(value) => updateParams({ orderStatus: value || undefined, page: 1 })} className="mb-5" />

      <AdminToolbar className="mb-5">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); updateParams({ search: event.target.value || undefined, page: 1 }); }}
          placeholder="Order number, customer, phone or transaction id"
          aria-label="Search orders"
          icon={<Icon name="search" className="h-4 w-4" />}
          containerClassName="min-w-[16rem] flex-1"
        />

        <Select
          value={paymentStatus}
          onChange={(event) => updateParams({ paymentStatus: event.target.value || undefined, page: 1 })}
          options={Object.entries(PAYMENT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
          placeholder="Any payment status"
          aria-label="Payment status"
          containerClassName="w-full sm:w-44"
        />

        <Input
          type="date"
          label=""
          value={dateInputValue(from)}
          onChange={(event) => updateParams({ from: event.target.value || undefined, page: 1 })}
          aria-label="From date"
          containerClassName="w-full sm:w-40"
        />

        <Input
          type="date"
          value={dateInputValue(to)}
          onChange={(event) => updateParams({ to: event.target.value || undefined, page: 1 })}
          aria-label="To date"
          containerClassName="w-full sm:w-40"
        />

        <Select
          value={sort}
          onChange={(event) => updateParams({ sort: event.target.value })}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'total-desc', label: 'Highest value' },
            { value: 'total-asc', label: 'Lowest value' },
          ]}
          aria-label="Sort orders"
          containerClassName="w-full sm:w-44"
        />

        {(search || paymentStatus || from || to || orderStatus) && (
          <Button
            variant="ghost"
            onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); }}
            icon={<Icon name="x" className="h-4 w-4" />}
          >
            Clear
          </Button>
        )}
      </AdminToolbar>

      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={sorted}
            emptyState={
              <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
                <EmptyState
                  icon="orders"
                  title="No orders match these filters"
                  description="Try clearing the search box or date range."
                />
              </div>
            }
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-ink-500">
              {data.pagination.total} order{data.pagination.total === 1 ? '' : 's'} ·{' '}
              {formatMoney(sorted.reduce((sum, order) => sum + order.total, 0))} on this page
              {orderStatus ? ` · filtered by ${ORDER_STATUS[orderStatus]?.label || orderStatus}` : ''}
            </p>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onChange={(next) => { updateParams({ page: next }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        </>
      )}
    </>
  );
}
