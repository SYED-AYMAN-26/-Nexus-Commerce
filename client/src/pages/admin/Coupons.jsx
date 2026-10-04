import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services';
import { AdminPageHeader, StatTile } from '../../components/admin/AdminParts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Alert, Checkbox, Input, Select } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/Misc';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/Feedback';
import { formatDate, formatMoney } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  code: '',
  description: '',
  type: 'percentage',
  value: '10',
  minOrderValue: '0',
  maxDiscount: '0',
  usageLimit: '0',
  perUserLimit: '1',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function AdminCoupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.coupons();
      setCoupons(result.coupons || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setValues(EMPTY);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (coupon) => {
    setEditing(coupon);
    setValues({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: String(coupon.minOrderValue ?? 0),
      maxDiscount: String(coupon.maxDiscount ?? 0),
      usageLimit: String(coupon.usageLimit ?? 0),
      perUserLimit: String(coupon.perUserLimit ?? 1),
      startsAt: toInputDate(coupon.startsAt),
      expiresAt: toInputDate(coupon.expiresAt),
      isActive: coupon.isActive,
    });
    setErrors({});
    setFormOpen(true);
  };

  const close = () => {
    setFormOpen(false);
    setEditing(null);
    setValues(EMPTY);
  };

  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (!/^[A-Z0-9-]{3,20}$/i.test(values.code.trim())) next.code = 'Use 3-20 letters, numbers or dashes';
    if (!(Number(values.value) > 0)) next.value = 'Enter a discount greater than zero';
    if (values.type === 'percentage' && Number(values.value) > 90) next.value = 'Percentage discount must be 90 or less';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      code: values.code.trim().toUpperCase(),
      description: values.description.trim(),
      type: values.type,
      value: Number(values.value),
      minOrderValue: Number(values.minOrderValue) || 0,
      maxDiscount: Number(values.maxDiscount) || 0,
      usageLimit: Number(values.usageLimit) || 0,
      perUserLimit: Number(values.perUserLimit) || 1,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      isActive: values.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateCoupon(editing._id, payload);
        toast.success(`${payload.code} updated`);
      } else {
        await adminApi.createCoupon(payload);
        toast.success(`${payload.code} created — shoppers can apply it at checkout`);
      }
      close();
      await load();
    } catch (err) {
      if (err.errors?.length) setErrors(err.errors.reduce((acc, item) => ({ ...acc, [item.field]: item.message }), {}));
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await adminApi.updateCoupon(coupon._id, { isActive: !coupon.isActive });
      toast.success(`${coupon.code} is now ${coupon.isActive ? 'disabled' : 'active'}`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteCoupon(deleteTarget._id);
      toast.success(`${deleteTarget.code} deleted`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const active = coupons.filter((coupon) => coupon.isActive && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()));
  const redemptions = coupons.reduce((sum, coupon) => sum + (coupon.usedCount || 0), 0);

  const columns = [
    {
      key: 'code',
      header: 'Coupon',
      render: (coupon) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink-900">{coupon.code}</span>
            <Badge tone={coupon.isActive ? 'success' : 'neutral'} size="sm" dot>
              {coupon.isActive ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          {coupon.description && <p className="mt-0.5 text-2xs text-ink-500">{coupon.description}</p>}
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (coupon) => (
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {coupon.type === 'percentage' ? `${coupon.value}% off` : `${formatMoney(coupon.value)} off`}
          </p>
          <p className="text-2xs text-ink-500">
            {coupon.minOrderValue > 0 ? `Min order ${formatMoney(coupon.minOrderValue)}` : 'No minimum'}
            {coupon.maxDiscount > 0 ? ` · cap ${formatMoney(coupon.maxDiscount)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (coupon) => (
        <div>
          <p className="text-sm font-medium text-ink-800">
            {coupon.usedCount || 0}
            {coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ' used'}
          </p>
          <p className="text-2xs text-ink-500">{coupon.perUserLimit} per customer</p>
        </div>
      ),
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (coupon) => {
        const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
        return (
          <div>
            <p className={`text-xs ${expired ? 'font-semibold text-danger-600' : 'text-ink-700'}`}>
              {coupon.expiresAt ? `${expired ? 'Expired' : 'Expires'} ${formatDate(coupon.expiresAt)}` : 'No expiry'}
            </p>
            {coupon.startsAt && <p className="text-2xs text-ink-500">From {formatDate(coupon.startsAt)}</p>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (coupon) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => toggleActive(coupon)}>
            {coupon.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openEdit(coupon)} aria-label={`Edit ${coupon.code}`}>
            <Icon name="edit" className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger-600 hover:bg-danger-50"
            onClick={() => setDeleteTarget(coupon)}
            aria-label={`Delete ${coupon.code}`}
          >
            <Icon name="trash" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Coupons"
        description="Discount codes are validated and applied server-side — the browser can never invent a discount."
        actions={
          <Button onClick={openCreate} icon={<Icon name="plus" className="h-4 w-4" />}>
            New coupon
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile label="Coupons" value={coupons.length} hint={`${active.length} currently valid`} icon="ticket" tone="brand" />
        <StatTile label="Redemptions" value={redemptions} hint="across all codes" icon="percent" tone="success" />
        <StatTile
          label="Disabled or expired"
          value={coupons.length - active.length}
          hint="cannot be applied at checkout"
          icon="alertCircle"
          tone={coupons.length - active.length ? 'warning' : 'success'}
        />
      </div>

      <Alert className="mb-5" variant="info" title="How discounts interact with totals">
        The coupon reduces the item subtotal before shipping and GST are calculated. Minimum order values and caps are
        always re-checked on the server at checkout.
      </Alert>

      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
        <DataTable
          columns={columns}
          rows={coupons}
          emptyState={
            <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
              <EmptyState
                icon="ticket"
                title="No coupons yet"
                description="Create a welcome discount to get started — shoppers apply codes in the cart."
                action={<Button onClick={openCreate}>New coupon</Button>}
              />
            </div>
          }
        />
      )}

      <Modal
        open={formOpen}
        onClose={close}
        size="lg"
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        description="Codes are stored uppercase and matched case-insensitively at checkout."
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code"
              required
              value={values.code}
              onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              error={errors.code}
              placeholder="WELCOME10"
              className="font-mono uppercase"
            />
            <Select
              label="Discount type"
              value={values.type}
              onChange={(event) => setValues((current) => ({ ...current, type: event.target.value }))}
              options={[
                { value: 'percentage', label: 'Percentage off subtotal' },
                { value: 'fixed', label: 'Fixed amount off' },
              ]}
            />
          </div>

          <Input
            label="Description (internal)"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="Welcome offer for first-time customers"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label={values.type === 'percentage' ? 'Percent off (%)' : 'Amount off (₹)'}
              required
              type="number"
              min="1"
              step="0.01"
              value={values.value}
              onChange={(event) => setValues((current) => ({ ...current, value: event.target.value }))}
              error={errors.value}
            />
            <Input
              label="Minimum order (₹)"
              type="number"
              min="0"
              value={values.minOrderValue}
              onChange={(event) => setValues((current) => ({ ...current, minOrderValue: event.target.value }))}
              hint="0 = no minimum"
            />
            <Input
              label="Max discount (₹)"
              type="number"
              min="0"
              value={values.maxDiscount}
              onChange={(event) => setValues((current) => ({ ...current, maxDiscount: event.target.value }))}
              hint="Caps percentage discounts"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Input
              label="Total uses"
              type="number"
              min="0"
              value={values.usageLimit}
              onChange={(event) => setValues((current) => ({ ...current, usageLimit: event.target.value }))}
              hint="0 = unlimited"
            />
            <Input
              label="Per customer"
              type="number"
              min="1"
              value={values.perUserLimit}
              onChange={(event) => setValues((current) => ({ ...current, perUserLimit: event.target.value }))}
            />
            <Input
              label="Starts"
              type="date"
              value={values.startsAt}
              onChange={(event) => setValues((current) => ({ ...current, startsAt: event.target.value }))}
            />
            <Input
              label="Expires"
              type="date"
              value={values.expiresAt}
              onChange={(event) => setValues((current) => ({ ...current, expiresAt: event.target.value }))}
              hint="Leave empty for no expiry"
            />
          </div>

          <Checkbox
            label="Active"
            description="Inactive coupons are rejected at checkout with a clear message"
            checked={values.isActive}
            onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
          />

          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
            <Button type="button" variant="outline" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save coupon' : 'Create coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this coupon?"
        confirmLabel="Delete coupon"
      >
        {deleteTarget && (
          <p className="text-sm text-ink-600">
            {deleteTarget.code} has been redeemed {deleteTarget.usedCount || 0} time(s). Deleting it stops future
            redemptions; completed orders keep their discount.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
