import { Link } from 'react-router-dom';
import { authApi, orderApi } from '../../services';
import { useAsyncData } from '../../hooks';
import { Breadcrumbs } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { formatDate, formatMoney } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

/** Account hub: KPIs, recent orders and quick links. */
export default function AccountOverview() {
  const { user } = useAuth();
  const { data: stats, loading: statsLoading } = useAsyncData(() => authApi.stats(), []);
  const { data: orders, loading: ordersLoading, error, refresh } = useAsyncData(() => orderApi.list({ limit: 3 }), []);

  const tiles = [
    { label: 'Orders placed', value: stats?.orderCount ?? '—', icon: 'orders', to: '/account/orders', tone: 'bg-brand-50 text-brand-600' },
    { label: 'Total spent', value: stats ? formatMoney(stats.totalSpent) : '—', icon: 'wallet', to: '/account/orders', tone: 'bg-success-50 text-success-600' },
    { label: 'In progress', value: stats?.pendingCount ?? '—', icon: 'truckFast', to: '/account/orders', tone: 'bg-warning-50 text-warning-600' },
    { label: 'Wishlist items', value: stats?.wishlistCount ?? '—', icon: 'heart', to: '/account/wishlist', tone: 'bg-danger-50 text-danger-600' },
  ];

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account' }]} />

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Hello, {user?.name?.split(' ')[0]}
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Member since {formatDate(user?.createdAt, { month: 'long', year: 'numeric' })} · Manage your orders, addresses and preferences here.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />

        <div className="min-w-0 space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((tile) => (
              <Link
                key={tile.label}
                to={tile.to}
                className="group rounded-2xl border border-ink-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${tile.tone}`}>
                  <Icon name={tile.icon} className="h-5 w-5" />
                </span>
                <p className="mt-3 text-xl font-bold tracking-tight text-ink-900">
                  {statsLoading ? <Skeleton className="h-6 w-16" /> : tile.value}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{tile.label}</p>
              </Link>
            ))}
          </div>

          {/* Recent orders */}
          <section className="rounded-2xl border border-ink-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900">Recent orders</h2>
              <Link to="/account/orders" className="link inline-flex items-center gap-1 text-sm">
                View all
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </Link>
            </div>

            {ordersLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : error ? (
              <ErrorState error={error} onRetry={refresh} />
            ) : (orders?.orders || []).length === 0 ? (
              <EmptyState
                compact
                icon="orders"
                title="No orders yet"
                description="When you place your first order it will show up here with live tracking."
                actionTo="/products"
                actionLabel="Start shopping"
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {orders.orders.map((order) => (
                  <li key={order._id}>
                    <Link to={`/account/orders/${order._id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-ink-50/60">
                      <div className="flex -space-x-3">
                        {order.items.slice(0, 3).map((item) => (
                          <img
                            key={item._id}
                            src={item.image}
                            alt=""
                            className="h-11 w-11 rounded-xl border-2 border-white object-cover shadow-sm"
                            loading="lazy"
                          />
                        ))}
                        {order.items.length > 3 && (
                          <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white bg-ink-100 text-xs font-semibold text-ink-600">
                            +{order.items.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-ink-900">{order.orderNumber}</p>
                        <p className="text-xs text-ink-500">
                          {formatDate(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={order.orderStatus} size="sm" />
                        <PaymentStatusBadge status={order.paymentStatus} size="sm" />
                      </div>

                      <p className="w-24 text-right text-sm font-bold text-ink-900">{formatMoney(order.total)}</p>
                      <Icon name="chevronRight" className="h-4 w-4 text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { to: '/account/edit', icon: 'user', title: 'Edit profile', copy: 'Name, email and password' },
              { to: '/account/addresses', icon: 'mapPin', title: 'Manage addresses', copy: `${user?.addresses?.length || 0} saved` },
              { to: '/account/wishlist', icon: 'heart', title: 'Your wishlist', copy: `${stats?.wishlistCount || 0} saved items` },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-3.5 rounded-2xl border border-ink-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600 transition group-hover:bg-brand-50 group-hover:text-brand-600">
                  <Icon name={action.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{action.title}</p>
                  <p className="text-xs text-ink-500">{action.copy}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
            <h2 className="text-lg font-bold">Unlock faster checkout</h2>
            <p className="mt-1.5 max-w-lg text-sm text-brand-100">
              Save a default shipping address and your next order takes about ten seconds.
            </p>
            <Button to="/account/addresses" className="mt-4 bg-white text-brand-700 hover:bg-brand-50">
              {user?.addresses?.length ? 'Manage addresses' : 'Add an address'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
