import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, ChartCard, StatTile } from '../../components/admin/AdminParts';
import { Badge, StockBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/Misc';
import { EmptyState, ErrorState, Loader } from '../../components/ui/Feedback';
import { formatMoney } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

/** Inventory health: low/out-of-stock alerts plus per-product and per-variant stock editing. */
export default function AdminInventory() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ stock: '0', lowStockThreshold: '10', variants: [] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.inventory();
      setData(result);
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

  const openEditor = async (product) => {
    setTarget(product);
    setSaving(true);
    try {
      // Load the full record so variant stock can be edited too.
      const { product: full } = await adminApi.product(product._id);
      setTarget(full);
      setForm({
        stock: String(full.stock ?? 0),
        lowStockThreshold: String(full.lowStockThreshold ?? data?.threshold ?? 10),
        variants: (full.variants || []).map((variant) => ({
          variantId: variant._id,
          name: variant.name,
          stock: String(variant.stock ?? 0),
        })),
      });
    } catch (err) {
      toast.error(err.message);
      setTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateInventory(target._id, {
        stock: Number(form.stock) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
        variants: form.variants.length
          ? form.variants.map((variant) => ({ variantId: variant.variantId, stock: Number(variant.stock) || 0 }))
          : undefined,
      });
      toast.success(`${target.name} inventory saved`);
      setTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const restockTargets = data ? [...data.outOfStock, ...data.lowStock] : [];

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center gap-3">
          <img src={product.images?.[0]} alt={product.name} className="h-10 w-10 rounded-lg border border-ink-200 object-cover" loading="lazy" />
          <div className="min-w-0">
            <Link to={`/admin/products/${product._id}/edit`} className="line-clamp-1 text-sm font-medium text-ink-900 hover:text-brand-700">
              {product.name}
            </Link>
            <p className="text-2xs text-ink-500">{product.category?.name || 'Uncategorised'} · <span className="font-mono">{product.SKU}</span></p>
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product) => (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${product.stock <= 0 ? 'text-danger-600' : 'text-ink-900'}`}>{product.stock}</span>
          <StockBadge status={product.stockStatus} size="sm" />
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Stock value',
      render: (product) => <span className="text-sm text-ink-700">{formatMoney(product.stock * (product.discountPrice || product.price))}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (product) => (
        <Button size="sm" variant="outline" onClick={() => openEditor(product)} icon={<Icon name="edit" className="h-3.5 w-3.5" />}>
          Adjust
        </Button>
      ),
    },
  ];

  if (loading) return <Loader className="py-28" label="Loading inventory…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description={`Products at or below ${data.threshold} units need restocking. Out-of-stock items cannot be purchased.`}
        actions={
          <>
            <Button variant="outline" onClick={load} icon={<Icon name="refresh" className="h-4 w-4" />}>
              Refresh
            </Button>
            <Button to="/admin/products" icon={<Icon name="plus" className="h-4 w-4" />}>
              Add product
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Units in stock" value={data.totalUnits.toLocaleString('en-IN')} hint={`${data.productCount} live products`} icon="package" tone="brand" />
        <StatTile label="Inventory value" value={formatMoney(data.inventoryValue)} hint="selling price × units" icon="wallet" tone="success" />
        <StatTile label="Low stock" value={data.lowStock.length} hint={`≤ ${data.threshold} units`} icon="alertTriangle" tone={data.lowStock.length ? 'warning' : 'success'} />
        <StatTile label="Out of stock" value={data.outOfStock.length} hint="hidden from purchase" icon="alertCircle" tone={data.outOfStock.length ? 'danger' : 'success'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Restock queue"
          description="Lowest stock first"
          empty={!restockTargets.length}
          emptyMessage="Nothing needs restocking right now."
        >
          <ul className="space-y-3">
            {restockTargets.map((product) => (
              <li key={product._id} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
                <img src={product.images?.[0]} alt={product.name} className="h-11 w-11 rounded-lg border border-ink-200 object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-ink-900">{product.name}</p>
                  <p className="text-2xs text-ink-500">{product.category?.name || 'Uncategorised'} · {product.brand}</p>
                </div>
                <Badge tone={product.stock <= 0 ? 'danger' : 'warning'} size="sm">
                  {product.stock <= 0 ? 'Out' : `${product.stock} left`}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openEditor(product)}>
                  Restock
                </Button>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Out of stock"
          description="These SKUs are blocked from checkout"
          empty={!data.outOfStock.length}
          emptyMessage="Every product is purchasable."
        >
          <EmptyState
            compact
            icon={data.outOfStock.length ? 'alertCircle' : 'checkCircle'}
            title={data.outOfStock.length ? `${data.outOfStock.length} product(s) unavailable` : 'Full availability'}
            description={
              data.outOfStock.length
                ? 'Update stock to bring them back into the storefront. Carts automatically drop unavailable items.'
                : 'No product is currently out of stock.'
            }
          />
        </ChartCard>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900">Full inventory</h2>
        <DataTable
          columns={columns}
          rows={[...data.outOfStock, ...data.lowStock]}
          emptyState={
            <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
              <EmptyState compact icon="warehouse" title="No alerts" description="Stock levels are healthy across the catalogue." />
            </div>
          }
        />
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        size="lg"
        title="Adjust inventory"
        description={target?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving} icon={<Icon name="check" className="h-4 w-4" />}>
              Save inventory
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Total stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                hint="Zero blocks purchases entirely"
              />
              <Input
                label="Low stock threshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
                hint="Drives the low-stock alert"
              />
            </div>

            {form.variants.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-ink-900">Variant stock</p>
                <div className="mt-3 space-y-2.5">
                  {form.variants.map((variant, index) => (
                    <div key={variant.variantId} className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{variant.name}</span>
                      <Input
                        type="number"
                        min="0"
                        value={variant.stock}
                        aria-label={`Stock for ${variant.name}`}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            variants: current.variants.map((item, i) => (i === index ? { ...item, stock: event.target.value } : item)),
                          }))
                        }
                        containerClassName="w-28"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-2xs text-ink-500">
                  Variant stock is what checkout reserves; the total below is the sum of all variants.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
