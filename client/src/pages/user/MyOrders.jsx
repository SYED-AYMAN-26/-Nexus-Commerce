import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderApi } from '../../services';
import { Breadcrumbs, Tabs } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Form';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate, formatMoney } from '../../utils/format';
import { useDebounce } from '../../hooks';

const TABS = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function MyOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;

  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    orderApi
      .list({ page, limit: 8, orderStatus: status || undefined, search: debouncedSearch || undefined })
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, status, debouncedSearch]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === null) next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next, { replace: true });
  };

  const orders = data?.orders || [];

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account', to: '/account' }, { label: 'Orders' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">My orders</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {data ? `${data.pagination.total} order${data.pagination.total === 1 ? '' : 's'} placed` : 'Track and manage every order you have placed.'}
          </p>
        </div>
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); updateParams({ search: event.target.value || undefined, page: 1 }); }}
          placeholder="Search order number or product"
          aria-label="Search orders"
          icon={<Icon name="search" className="h-4 w-4" />}
          containerClassName="w-full sm:w-72"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />

        <div className="min-w-0">
          <Tabs
            tabs={TABS}
            value={status}
            onChange={(next) => updateParams({ status: next || undefined, page: 1 })}
          />

          <div className="mt-6">
            {error ? (
              <ErrorState error={error} onRetry={() => updateParams({ page })} />
            ) : loading ? (
              <SkeletonTable rows={4} columns={4} />
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/40">
                <EmptyState
                  icon="orders"
                  title={search ? 'No matching orders' : status ? `No ${status} orders` : 'You have not ordered yet'}
                  description={
                    search
                      ? 'Try a different order number or product name.'
                      : 'Once you place an order it will appear here with live tracking.'
                  }
                  action={
                    <div className="flex flex-wrap justify-center gap-3">
                      {(search || status) && (
                        <Button variant="outline" onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); }}>
                          Clear filters
                        </Button>
                      )}
                      <Button to="/products">Start shopping</Button>
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <article key={order._id} className="overflow-hidden rounded-2xl border border-ink-200 bg-white transition hover:shadow-card-hover">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-ink-900">{order.orderNumber}</span>
                        <span className="text-xs text-ink-500">Placed {formatDate(order.createdAt)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={order.orderStatus} size="sm" />
                        <PaymentStatusBadge status={order.paymentStatus} size="sm" />
                      </div>
                    </header>

                    <div className="flex flex-wrap items-center gap-5 px-5 py-4">
                      <div className="flex -space-x-3">
                        {order.items.slice(0, 4).map((item) => (
                          <Link key={item._id} to={`/product/${item.slug}`} className="relative">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-14 w-14 rounded-xl border-2 border-white object-cover shadow-sm transition hover:scale-105"
                              loading="lazy"
                            />
                          </Link>
                        ))}
                        {order.items.length > 4 && (
                          <span className="grid h-14 w-14 place-items-center rounded-xl border-2 border-white bg-ink-100 text-xs font-semibold text-ink-600">
                            +{order.items.length - 4}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-ink-800">
                          {order.items.map((item) => item.name).join(', ')}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {order.paymentMethod} · Delivering to{' '}
                          {order.shippingAddress.city}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-bold text-ink-900">{formatMoney(order.total)}</p>
                        <Link
                          to={`/account/orders/${order._id}`}
                          className="link inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          View details
                          <Icon name="arrowRight" className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Mini progress tracker */}
                    {order.orderStatus !== 'cancelled' && (
                      <div className="flex items-center gap-1.5 px-5 pb-4">
                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((stage, index) => {
                          const stageIndex = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(order.orderStatus);
                          const done = index <= stageIndex;
                          return (
                            <span
                              key={stage}
                              className={`h-1.5 flex-1 rounded-full transition ${done ? 'bg-brand-500' : 'bg-ink-200'}`}
                              title={stage}
                            />
                          );
                        })}
                      </div>
                    )}
                  </article>
                ))}

                <Pagination
                  className="mt-6"
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  onChange={(next) => { updateParams({ page: next }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
