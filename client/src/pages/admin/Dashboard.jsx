import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services';
import { AreaChart, AdminPageHeader, BarChart, ChartCard, RankedBars, StatTile } from '../../components/admin/AdminParts';
import { Badge, OrderStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Form';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { RatingStars } from '../../components/ui/Rating';
import { formatDate, formatMoney, formatRelativeTime, initials } from '../../utils/format';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [days, setDays] = useState('30');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (range = days, { silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await adminApi.dashboard(Number(range));
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days],
  );

  useEffect(() => {
    load(days);
  }, [days, load]);

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Dashboard" description="Live store performance from the MongoDB order ledger." />
        <DashboardSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminPageHeader title="Dashboard" />
        <ErrorState error={error} onRetry={() => load(days)} />
      </>
    );
  }

  const { overview, sales, bestSellers, mostViewed, categoryPerformance, inventory, recentOrders, recentUsers, recentReviews, generatedAt } = data;

  const revenueSeries = sales.map((row) => ({ ...row, revenue: Number(row.revenue) || 0 }));
  const orderSeries = sales.map((row) => ({ ...row, orders: Number(row.orders) || 0 }));
  const hasSales = revenueSeries.some((row) => row.revenue > 0 || row.orders > 0);

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`Sales, customers and inventory health — generated ${formatRelativeTime(generatedAt)}.`}
        actions={
          <>
            <Select
              value={days}
              onChange={(event) => setDays(event.target.value)}
              options={RANGES}
              aria-label="Date range"
              className="min-w-[10rem]"
            />
            <Button
              variant="outline"
              loading={refreshing}
              onClick={() => load(days, { silent: true })}
              icon={<Icon name="refresh" className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button to="/admin/orders" icon={<Icon name="orders" className="h-4 w-4" />}>
              Manage orders
            </Button>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Revenue (all time)"
          value={formatMoney(overview.totalRevenue)}
          hint={`${formatMoney(overview.revenueThisMonth)} this month`}
          icon="trendingUp"
          tone="success"
        />
        <StatTile
          label={`Revenue ${days}d`}
          value={formatMoney(overview.revenueLast30Days)}
          delta={overview.revenueGrowthPct}
          hint="vs previous period"
          icon="activity"
          tone="brand"
        />
        <StatTile
          label="Orders"
          value={overview.totalOrders.toLocaleString('en-IN')}
          hint={`${overview.pendingOrders} awaiting action · ${overview.completedOrders} delivered`}
          icon="orders"
          tone="warning"
          to="/admin/orders"
        />
        <StatTile
          label="Average order value"
          value={formatMoney(overview.averageOrderValue)}
          hint={`${overview.cancelledOrders} cancelled orders`}
          icon="wallet"
          tone="neutral"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Customers" value={overview.totalUsers.toLocaleString('en-IN')} hint={`${overview.newUsersThisMonth} joined this month`} icon="users" tone="brand" to="/admin/users" />
        <StatTile label="Products live" value={overview.totalProducts.toLocaleString('en-IN')} hint={`${overview.totalCategories} categories`} icon="box" tone="neutral" to="/admin/products" />
        <StatTile label="Published reviews" value={overview.totalReviews.toLocaleString('en-IN')} icon="star" tone="warning" to="/admin/reviews" />
        <StatTile
          label="Inventory value"
          value={formatMoney(inventory.inventoryValue)}
          hint={`${inventory.totalUnits.toLocaleString('en-IN')} units · ${inventory.lowStock.length} low · ${inventory.outOfStock.length} out`}
          icon="warehouse"
          tone={inventory.outOfStock.length ? 'danger' : 'success'}
          to="/admin/inventory"
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Revenue trend"
          description={`Paid revenue per day over the last ${days} days`}
          empty={!hasSales}
          emptyMessage="No orders in this window — place a test order from the storefront to populate the chart."
        >
          <AreaChart data={revenueSeries} valueKey="revenue" formatValue={formatMoney} />
        </ChartCard>

        <ChartCard
          title="Order volume"
          description="Orders created per day"
          empty={!hasSales}
          emptyMessage="No orders in this window."
        >
          <BarChart data={orderSeries} valueKey="orders" formatValue={(value) => `${value}`} tone="bg-ink-800" />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Best sellers"
          description="Units sold, all time"
          empty={!bestSellers.length}
          emptyMessage="Nothing sold yet."
        >
          <RankedBars
            items={bestSellers.map((product) => ({
              label: product.name,
              value: product.units,
              meta: `${formatMoney(product.revenue)} revenue`,
            }))}
            formatValue={(value) => `${value} sold`}
            barTone="bg-success-500"
          />
        </ChartCard>

        <ChartCard
          title="Category performance"
          description="Revenue by category"
          empty={!categoryPerformance.length}
          emptyMessage="No category revenue yet."
        >
          <RankedBars
            items={categoryPerformance.slice(0, 7).map((row) => ({
              label: row.name,
              value: row.revenue,
              meta: `${row.units} units`,
            }))}
            formatValue={formatMoney}
          />
        </ChartCard>

        <ChartCard
          title="Top rated"
          description="Most sold live catalogue items"
          empty={!mostViewed.length}
          emptyMessage="No products yet."
        >
          <ul className="divide-y divide-ink-100">
            {mostViewed.slice(0, 6).map((product) => (
              <li key={product._id} className="flex items-center gap-3 py-3">
                <img src={product.image} alt={product.name} className="h-11 w-11 rounded-lg border border-ink-200 object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${product.slug}`} className="line-clamp-1 text-sm font-medium text-ink-900 hover:text-brand-700">
                    {product.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <RatingStars value={product.rating} size="xs" />
                    <span className="text-2xs text-ink-500">{product.sold} sold · {product.stock} in stock</span>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink-900">{formatMoney(product.price)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* Inventory alerts + recent activity */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <ChartCard
          title="Inventory alerts"
          description={`Threshold ${inventory.threshold} units`}
          actions={<Button to="/admin/inventory" size="sm" variant="outline">Restock</Button>}
          empty={!inventory.lowStock.length && !inventory.outOfStock.length}
          emptyMessage="Every product is comfortably in stock."
        >
          <ul className="space-y-2.5">
            {[...inventory.outOfStock, ...inventory.lowStock].slice(0, 6).map((product) => (
              <li key={product._id} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
                <img src={product.images?.[0]} alt={product.name} className="h-10 w-10 rounded-lg border border-ink-200 object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-ink-900">{product.name}</p>
                  <p className="text-2xs text-ink-500">{product.category?.name || 'Uncategorised'} · {product.SKU}</p>
                </div>
                <Badge tone={product.stock <= 0 ? 'danger' : 'warning'} size="sm">
                  {product.stock <= 0 ? 'Out of stock' : `${product.stock} left`}
                </Badge>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Recent orders"
          description="Newest first"
          actions={<Button to="/admin/orders" size="sm" variant="ghost" iconRight={<Icon name="arrowRight" className="h-3.5 w-3.5" />}>All orders</Button>}
          empty={!recentOrders.length}
          emptyMessage="No orders yet."
        >
          <div className="overflow-x-auto scroll-thin">
            <table className="table min-w-[520px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/admin/orders/${order._id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                        {order.orderNumber}
                      </Link>
                      <p className="text-2xs text-ink-500">{formatDate(order.createdAt)}</p>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-ink-800">{order.user?.name || order.shippingAddress?.fullName}</p>
                      <p className="text-2xs text-ink-500">{order.user?.email || order.shippingAddress?.phone}</p>
                    </td>
                    <td><OrderStatusBadge status={order.orderStatus} size="sm" /></td>
                    <td className="text-right text-sm font-semibold text-ink-900">{formatMoney(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="New customers" description="Most recent sign-ups" empty={!recentUsers.length} emptyMessage="No customers yet.">
          <ul className="space-y-2.5">
            {recentUsers.map((customer) => (
              <li key={customer._id} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {initials(customer.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{customer.name}</p>
                  <p className="truncate text-2xs text-ink-500">{customer.email}</p>
                </div>
                <span className="shrink-0 text-2xs text-ink-500">{formatRelativeTime(customer.createdAt)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Latest reviews" description="Straight from customers" empty={!recentReviews.length} emptyMessage="No reviews yet.">
          <ul className="space-y-3">
            {recentReviews.slice(0, 5).map((review) => (
              <li key={review._id} className="rounded-xl border border-ink-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <RatingStars value={review.rating} size="xs" />
                  <span className="text-2xs text-ink-500">{formatRelativeTime(review.createdAt)}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-ink-700">{review.comment}</p>
                <p className="mt-1 text-2xs text-ink-500">
                  {review.user?.name} on <Link to={`/product/${review.product?.slug}`} className="link">{review.product?.name}</Link>
                </p>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <p className="mt-6 text-xs text-ink-500">
        {overview.totalOrders} orders recorded · {overview.pendingOrders} pending · {overview.completedOrders} delivered ·{' '}
        {overview.cancelledOrders} cancelled · {overview.totalProducts} products live
      </p>
    </>
  );
}
