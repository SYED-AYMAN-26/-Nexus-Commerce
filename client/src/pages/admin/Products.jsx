import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, AdminToolbar, StatTile } from '../../components/admin/AdminParts';
import { Badge, StockBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input, Select } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/Misc';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/Feedback';
import { STOCK_STATUS } from '../../utils/constants';
import { formatMoney } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks';

export default function AdminProducts() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const stock = params.get('stock') || '';
  const sort = params.get('sort') || 'newest';

  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stockTarget, setStockTarget] = useState(null);
  const [stockValue, setStockValue] = useState('0');
  const [savingStock, setSavingStock] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    adminApi.categories().then((result) => setCategories(result.categories || [])).catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.products({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        category: category || undefined,
        status: status || undefined,
        stock: stock || undefined,
        sort,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, status, stock, sort]);

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

  const openStock = (product) => {
    setStockTarget(product);
    setStockValue(String(product.stock));
  };

  const saveStock = async () => {
    setSavingStock(true);
    try {
      await adminApi.updateStock(stockTarget._id, { stock: Number(stockValue) });
      toast.success(`${stockTarget.name} stock updated to ${stockValue}`);
      setStockTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStock(false);
    }
  };

  const toggleActive = async (product) => {
    try {
      await adminApi.updateProduct(product._id, { isActive: !product.isActive });
      toast.success(`${product.name} is now ${product.isActive ? 'hidden from' : 'visible in'} the storefront`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const result = await adminApi.deleteProduct(deleteTarget._id, forceDelete);
      toast.success(result.archived ? `${deleteTarget.name} archived (it has order history)` : `${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setForceDelete(false);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center gap-3">
          <img src={product.images?.[0]} alt={product.name} className="h-11 w-11 rounded-lg border border-ink-200 object-cover" loading="lazy" />
          <div className="min-w-0">
            <Link to={`/admin/products/${product._id}/edit`} className="line-clamp-1 text-sm font-semibold text-ink-900 hover:text-brand-700">
              {product.name}
            </Link>
            <p className="text-2xs text-ink-500">
              {product.brand} · <span className="font-mono">{product.SKU}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product) => (
        <span className="text-xs text-ink-600">{product.category?.name || '—'}</span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (product) => (
        <div>
          <p className="text-sm font-semibold text-ink-900">{formatMoney(product.discountPrice || product.price)}</p>
          {product.discountPrice > 0 && (
            <p className="text-2xs text-ink-500">
              <span className="line-through">{formatMoney(product.price)}</span>{' '}
              <Badge tone="danger" size="sm">{Math.round(((product.price - product.discountPrice) / product.price) * 100)}% off</Badge>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product) => (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900">
            {product.stock}
            {product.variants?.length ? <span className="text-2xs font-normal text-ink-500"> · {product.variants.length} variants</span> : null}
          </p>
          <StockBadge status={product.stockStatus} size="sm" />
        </div>
      ),
    },
    {
      key: 'sales',
      header: 'Sales',
      render: (product) => (
        <div>
          <p className="text-sm font-medium text-ink-800">{product.sold} sold</p>
          <p className="text-2xs text-ink-500">{product.numReviews} reviews · {product.rating?.toFixed(1) || '—'}★</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Visibility',
      render: (product) => (
        <button type="button" onClick={() => toggleActive(product)} className="inline-flex items-center gap-1.5" title="Toggle storefront visibility">
          <span className={`h-4 w-7 rounded-full p-0.5 transition ${product.isActive ? 'bg-success-500' : 'bg-ink-300'}`}>
            <span className={`block h-3 w-3 rounded-full bg-white transition ${product.isActive ? 'translate-x-3' : ''}`} />
          </span>
          <span className={`text-2xs font-semibold ${product.isActive ? 'text-success-600' : 'text-ink-500'}`}>
            {product.isActive ? 'Live' : 'Hidden'}
          </span>
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (product) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => openStock(product)} icon={<Icon name="warehouse" className="h-3.5 w-3.5" />}>
            Stock
          </Button>
          <Button size="sm" variant="ghost" to={`/admin/products/${product._id}/edit`} aria-label={`Edit ${product.name}`}>
            <Icon name="edit" className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`}>
            <Icon name="trash" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const summary = data?.summary;

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Create, price and publish catalogue items. Variants, stock and discounts are all managed here."
        actions={
          <>
            <Button variant="outline" to="/admin/categories" icon={<Icon name="tag" className="h-4 w-4" />}>
              Categories
            </Button>
            <Button to="/admin/products/new" icon={<Icon name="plus" className="h-4 w-4" />}>
              New product
            </Button>
          </>
        }
      />

      {summary && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Catalogue size" value={data.pagination.total.toLocaleString('en-IN')} hint="matching current filters" icon="box" tone="brand" />
          <StatTile label="Units in stock" value={summary.totalStock.toLocaleString('en-IN')} icon="package" tone="success" />
          <StatTile label="Inventory value" value={formatMoney(summary.inventoryValue)} hint="at selling price" icon="wallet" tone="neutral" />
          <StatTile label="Out of stock" value={summary.outOfStock.toLocaleString('en-IN')} icon="alertTriangle" tone={summary.outOfStock ? 'danger' : 'success'} to="/admin/inventory" />
        </div>
      )}

      <AdminToolbar className="mb-5">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); updateParams({ search: event.target.value || undefined, page: 1 }); }}
          placeholder="Search name, SKU or brand"
          aria-label="Search products"
          icon={<Icon name="search" className="h-4 w-4" />}
          containerClassName="min-w-[15rem] flex-1"
        />
        <Select
          value={category}
          onChange={(event) => updateParams({ category: event.target.value || undefined, page: 1 })}
          options={categories.map((item) => ({ value: item._id, label: `${item.name} (${item.productCount})` }))}
          placeholder="All categories"
          aria-label="Filter by category"
          containerClassName="w-full sm:w-52"
        />
        <Select
          value={status}
          onChange={(event) => updateParams({ status: event.target.value || undefined, page: 1 })}
          options={[
            { value: 'active', label: 'Live only' },
            { value: 'inactive', label: 'Hidden only' },
          ]}
          placeholder="Any visibility"
          aria-label="Filter by visibility"
          containerClassName="w-full sm:w-44"
        />
        <Select
          value={stock}
          onChange={(event) => updateParams({ stock: event.target.value || undefined, page: 1 })}
          options={[
            { value: 'low', label: STOCK_STATUS.low_stock.label },
            { value: 'out', label: STOCK_STATUS.out_of_stock.label },
          ]}
          placeholder="Any stock level"
          aria-label="Filter by stock"
          containerClassName="w-full sm:w-44"
        />
        <Select
          value={sort}
          onChange={(event) => updateParams({ sort: event.target.value })}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'name', label: 'Name A-Z' },
            { value: 'price-desc', label: 'Price high-low' },
            { value: 'price-asc', label: 'Price low-high' },
            { value: 'stock', label: 'Lowest stock' },
            { value: 'sold', label: 'Best selling' },
          ]}
          aria-label="Sort products"
          containerClassName="w-full sm:w-44"
        />
      </AdminToolbar>

      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data.products}
            emptyState={
              <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
                <EmptyState
                  icon="box"
                  title="No products match these filters"
                  description="Adjust the filters or create a new product."
                  action={<Button to="/admin/products/new">New product</Button>}
                />
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

      {/* Quick stock editor */}
      <Modal
        open={Boolean(stockTarget)}
        onClose={() => setStockTarget(null)}
        size="sm"
        title="Adjust stock"
        description={stockTarget?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setStockTarget(null)} disabled={savingStock}>
              Cancel
            </Button>
            <Button onClick={saveStock} loading={savingStock}>
              Save stock
            </Button>
          </>
        }
      >
        {stockTarget && (
          <div className="space-y-4">
            <Input
              label="Units available"
              type="number"
              min="0"
              value={stockValue}
              onChange={(event) => setStockValue(event.target.value)}
              hint="Setting stock to 0 hides the buy button on the storefront."
              required
            />
            {stockTarget.variants?.length > 0 && (
              <p className="rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
                This product has {stockTarget.variants.length} variants — for per-variant stock use the{' '}
                <Link to="/admin/inventory" className="link font-semibold">inventory page</Link>.
              </p>
            )}
            <p className="text-xs text-ink-500">
              Current badge: <StockBadge status={stockTarget.stockStatus} size="sm" />
            </p>
          </div>
        )}
      </Modal>

      {/* Delete / archive */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => { setDeleteTarget(null); setForceDelete(false); }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this product?"
        confirmLabel={forceDelete ? 'Delete permanently' : 'Delete product'}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              <span className="font-semibold text-ink-900">{deleteTarget.name}</span> will be removed from the
              catalogue. Products with order history are archived instead so invoices stay valid.
            </p>
            <label className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50/60 p-3 text-xs text-danger-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-danger-300 text-danger-600"
                checked={forceDelete}
                onChange={(event) => setForceDelete(event.target.checked)}
              />
              Force delete — remove the document even if it has been ordered (not recommended).
            </label>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
