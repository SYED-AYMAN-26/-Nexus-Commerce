import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, AdminToolbar, InfoRow, StatTile } from '../../components/admin/AdminParts';
import { Badge, OrderStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input, Select } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/Misc';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, Loader, SkeletonTable } from '../../components/ui/Feedback';
import { formatDate, formatDateTime, formatMoney, initials } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks';

export default function AdminUsers() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const role = params.get('role') || '';
  const status = params.get('status') || '';

  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [roleTarget, setRoleTarget] = useState(null);
  const [nextRole, setNextRole] = useState('user');
  const [savingRole, setSavingRole] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.users({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        role: role || undefined,
        status: status || undefined,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, role, status]);

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

  const openDetail = async (user) => {
    setDetail({ user, orders: [], stats: null });
    setDetailLoading(true);
    try {
      const result = await adminApi.user(user._id);
      setDetail(result);
    } catch (err) {
      toast.error(err.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveRole = async () => {
    setSavingRole(true);
    try {
      const result = await adminApi.updateUserRole(roleTarget._id, nextRole);
      toast.success(result.message || 'Role updated');
      setRoleTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingRole(false);
    }
  };

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      const result = await adminApi.updateUserStatus(statusTarget._id, !statusTarget.isActive);
      toast.success(result.message || 'Account updated');
      setStatusTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const columns = [
    {
      key: 'user',
      header: 'Customer',
      render: (user) => (
        <button type="button" onClick={() => openDetail(user)} className="flex items-center gap-3 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700">{user.name}</p>
            <p className="truncate text-2xs text-ink-500">{user.email}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'} size="sm">
          {user.role === 'admin' ? 'Admin' : 'Customer'}
        </Badge>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      render: (user) => (
        <div>
          <p className="text-sm font-medium text-ink-800">{user.orderCount} orders</p>
          <p className="text-2xs text-ink-500">{formatMoney(user.totalSpent)} spent</p>
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (user) => (
        <div>
          <p className="text-xs text-ink-700">{formatDate(user.createdAt)}</p>
          <p className="text-2xs text-ink-500">{user.isActive ? 'Sign-in allowed' : 'Sign-in blocked'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge tone={user.isActive ? 'success' : 'danger'} size="sm" dot>
          {user.isActive ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (user) => {
        const isSelf = String(user._id) === String(currentUser?._id);
        return (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => { setRoleTarget(user); setNextRole(user.role); }} disabled={isSelf}>
              Role
            </Button>
            <Button
              size="sm"
              variant={user.isActive ? 'ghost' : 'outline'}
              className={user.isActive ? 'text-danger-600 hover:bg-danger-50' : ''}
              onClick={() => setStatusTarget(user)}
              disabled={isSelf}
            >
              {user.isActive ? 'Disable' : 'Enable'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Account roles and access. Passwords are never exposed — only bcrypt hashes exist on the server."
      />

      {data && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatTile label="Accounts" value={data.pagination.total.toLocaleString('en-IN')} hint="matching filters" icon="users" tone="brand" />
          <StatTile
            label="Admins"
            value={data.users.filter((user) => user.role === 'admin').length}
            hint="on this page"
            icon="shield"
            tone="neutral"
          />
          <StatTile
            label="Disabled"
            value={data.users.filter((user) => !user.isActive).length}
            hint="on this page"
            icon="alertCircle"
            tone={data.users.some((user) => !user.isActive) ? 'warning' : 'success'}
          />
        </div>
      )}

      <AdminToolbar className="mb-5">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); updateParams({ search: event.target.value || undefined, page: 1 }); }}
          placeholder="Search name, email or phone"
          aria-label="Search customers"
          icon={<Icon name="search" className="h-4 w-4" />}
          containerClassName="min-w-[15rem] flex-1"
        />
        <Select
          value={role}
          onChange={(event) => updateParams({ role: event.target.value || undefined, page: 1 })}
          options={[
            { value: 'user', label: 'Customers' },
            { value: 'admin', label: 'Admins' },
          ]}
          placeholder="Any role"
          aria-label="Filter by role"
          containerClassName="w-full sm:w-40"
        />
        <Select
          value={status}
          onChange={(event) => updateParams({ status: event.target.value || undefined, page: 1 })}
          options={[
            { value: 'active', label: 'Active only' },
            { value: 'disabled', label: 'Disabled only' },
          ]}
          placeholder="Any status"
          aria-label="Filter by status"
          containerClassName="w-full sm:w-40"
        />
      </AdminToolbar>

      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data.users}
            emptyState={
              <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
                <EmptyState icon="users" title="No accounts match these filters" description="Try a different search term." />
              </div>
            }
          />

          <div className="mt-5">
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              showSummary
              total={data.pagination.total}
              limit={15}
              onChange={(next) => { updateParams({ page: next }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        </>
      )}

      {/* Customer detail */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail?.user?.name || 'Customer'}
        description={detail?.user?.email}
      >
        {detailLoading || !detail?.stats ? (
          <Loader className="py-16" label="Loading customer…" />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-200 p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-500">Lifetime spend</p>
                <p className="mt-1 text-lg font-bold text-ink-900">{formatMoney(detail.stats.totalSpent)}</p>
              </div>
              <div className="rounded-xl border border-ink-200 p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-500">Paid orders</p>
                <p className="mt-1 text-lg font-bold text-ink-900">{detail.stats.paidOrders}</p>
              </div>
              <div className="rounded-xl border border-ink-200 p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-500">Wishlist</p>
                <p className="mt-1 text-lg font-bold text-ink-900">{detail.user.wishlist?.length || 0} items</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Account</p>
                <div className="mt-2">
                  <InfoRow label="Role">{detail.user.role}</InfoRow>
                  <InfoRow label="Status">{detail.user.isActive ? 'Active' : 'Disabled'}</InfoRow>
                  <InfoRow label="Joined">{formatDate(detail.user.createdAt)}</InfoRow>
                  <InfoRow label="Last login">{detail.user.lastLoginAt ? formatDateTime(detail.user.lastLoginAt) : 'Never'}</InfoRow>
                  <InfoRow label="Phone">{detail.user.phone || '—'}</InfoRow>
                  <InfoRow label="Addresses">{detail.user.addresses?.length || 0}</InfoRow>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Recent orders</p>
                {detail.orders.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-ink-200 p-4 text-xs text-ink-500">
                    This customer has not ordered yet.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-ink-100">
                    {detail.orders.slice(0, 6).map((order) => (
                      <li key={order._id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-ink-800">{order.orderNumber}</p>
                          <p className="text-2xs text-ink-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <OrderStatusBadge status={order.orderStatus} size="sm" />
                        <span className="text-xs font-semibold text-ink-900">{formatMoney(order.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
              <Button variant="outline" onClick={() => { setRoleTarget(detail.user); setNextRole(detail.user.role); setDetail(null); }}>
                Change role
              </Button>
              <Button
                variant={detail.user.isActive ? 'danger' : 'primary'}
                onClick={() => { setStatusTarget(detail.user); setDetail(null); }}
                disabled={String(detail.user._id) === String(currentUser?._id)}
              >
                {detail.user.isActive ? 'Disable account' : 'Enable account'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Role change */}
      <ConfirmDialog
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        onConfirm={saveRole}
        loading={savingRole}
        title="Change account role"
        confirmLabel="Update role"
        variant="primary"
      >
        {roleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              {roleTarget.name} is currently {roleTarget.role === 'admin' ? 'an administrator' : 'a customer'}.
            </p>
            <Select
              label="New role"
              value={nextRole}
              onChange={(event) => setNextRole(event.target.value)}
              options={[
                { value: 'user', label: 'Customer — storefront only' },
                { value: 'admin', label: 'Administrator — full console access' },
              ]}
            />
            <p className="rounded-xl bg-warning-50 p-3 text-xs text-warning-700">
              Their existing sessions are revoked immediately so the new permissions take effect on the next login.
            </p>
          </div>
        )}
      </ConfirmDialog>

      {/* Enable / disable */}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={saveStatus}
        loading={savingStatus}
        title={statusTarget?.isActive ? 'Disable this account?' : 'Enable this account?'}
        confirmLabel={statusTarget?.isActive ? 'Disable account' : 'Enable account'}
        variant={statusTarget?.isActive ? 'danger' : 'primary'}
      >
        {statusTarget && (
          <p className="text-sm text-ink-600">
            {statusTarget.isActive
              ? `${statusTarget.name} will be signed out and blocked from logging in until re-enabled.`
              : `${statusTarget.name} will be able to sign in again immediately.`}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
