import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, ChartCard } from '../../components/admin/AdminParts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Alert, Checkbox, Input, Select, Textarea } from '../../components/ui/Form';
import { ConfirmDialog } from '../../components/ui/Modal';
import { ErrorState, Loader } from '../../components/ui/Feedback';
import { TabbedForm } from '../../components/admin/TabbedForm';
import { formatMoney } from '../../utils/format';
import { validateProduct } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';

const EMPTY = {
  name: '',
  brand: '',
  SKU: '',
  category: '',
  price: '',
  discountPrice: '',
  stock: '0',
  lowStockThreshold: '10',
  shortDescription: '',
  description: '',
  images: [],
  variants: [],
  specifications: [],
  tags: [],
  isActive: true,
  isFeatured: false,
  isNewArrival: false,
  freeShipping: false,
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/** Create / edit a catalogue product, including variants, images and merchandising flags. */
export default function AdminProductForm() {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [imageDraft, setImageDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [variantDraft, setVariantDraft] = useState({ name: '', color: '', size: '', priceDelta: '0', stock: '0' });
  const [specDraft, setSpecDraft] = useState({ key: '', value: '' });

  useEffect(() => {
    adminApi
      .categories()
      .then((result) => setCategories(result.categories || []))
      .catch((err) => setLoadError(err));
  }, []);

  const loadProduct = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const { product } = await adminApi.product(productId);
      setValues({
        ...EMPTY,
        ...product,
        price: String(product.price ?? ''),
        discountPrice: product.discountPrice ? String(product.discountPrice) : '',
        stock: String(product.stock ?? 0),
        lowStockThreshold: String(product.lowStockThreshold ?? 10),
        category: product.category?._id || product.category || '',
        images: product.images || [],
        variants: (product.variants || []).map((variant) => ({
          ...variant,
          priceDelta: String(variant.priceDelta ?? 0),
          stock: String(variant.stock ?? 0),
        })),
        specifications: product.specifications || [],
        tags: product.tags || [],
      });
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [isEdit, productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
  };

  const variantStockTotal = values.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
  const effectiveStock = values.variants.length ? variantStockTotal : Number(values.stock) || 0;
  const sellingPrice = Number(values.discountPrice) > 0 ? Number(values.discountPrice) : Number(values.price) || 0;
  const discountPercent =
    Number(values.discountPrice) > 0 && Number(values.price) > 0
      ? Math.round(((Number(values.price) - Number(values.discountPrice)) / Number(values.price)) * 100)
      : 0;

  const previewImage = useMemo(
    () => values.images[0] || `/api/media/products/${slugify(values.name) || 'nexus'}.svg?i=0`,
    [values.images, values.name],
  );

  const addImage = (url) => {
    const value = (url || imageDraft).trim();
    if (!value) return;
    if (values.images.length >= 8) {
      toast.error('A product can have at most 8 images');
      return;
    }
    setValues((current) => ({ ...current, images: [...current.images, value] }));
    setImageDraft('');
  };

  const addGeneratedImage = () => {
    const slug = slugify(values.name) || 'nexus-product';
    addImage(`/api/media/products/${slug}.svg?i=${values.images.length}`);
  };

  const addVariant = () => {
    if (!variantDraft.name.trim()) {
      toast.error('Give the variant a name, e.g. "Midnight / M"');
      return;
    }
    setValues((current) => ({
      ...current,
      variants: [...current.variants, { ...variantDraft, name: variantDraft.name.trim() }],
    }));
    setVariantDraft({ name: '', color: '', size: '', priceDelta: '0', stock: '0' });
  };

  const updateVariant = (index, field, value) => {
    setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)),
    }));
  };

  const removeVariant = (index) => {
    setValues((current) => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateProduct(values);
    setErrors(validation);
    if (Object.keys(validation).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    const payload = {
      name: values.name.trim(),
      brand: values.brand.trim(),
      SKU: values.SKU.trim().toUpperCase(),
      category: values.category,
      price: Number(values.price),
      discountPrice: Number(values.discountPrice) > 0 ? Number(values.discountPrice) : 0,
      stock: Number(values.stock) || 0,
      lowStockThreshold: Number(values.lowStockThreshold) || 10,
      shortDescription: values.shortDescription.trim(),
      description: values.description.trim(),
      images: values.images,
      variants: values.variants.map((variant) => ({
        name: variant.name,
        color: variant.color || '',
        size: variant.size || '',
        priceDelta: Number(variant.priceDelta) || 0,
        stock: Number(variant.stock) || 0,
        sku: variant.sku || undefined,
      })),
      specifications: values.specifications,
      tags: values.tags,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      isNewArrival: values.isNewArrival,
      freeShipping: values.freeShipping,
    };

    setSaving(true);
    try {
      const result = isEdit ? await adminApi.updateProduct(productId, payload) : await adminApi.createProduct(payload);
      toast.success(result.message || 'Product saved');
      navigate('/admin/products');
    } catch (err) {
      if (err.errors?.length) {
        setErrors(err.errors.reduce((acc, item) => ({ ...acc, [item.field]: item.message }), {}));
      }
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    setDeleting(true);
    try {
      const result = await adminApi.deleteProduct(productId);
      toast.success(result.archived ? 'Product archived because it has order history' : 'Product deleted');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader className="py-28" label="Loading product…" />;
  if (loadError) return <ErrorState error={loadError} onRetry={loadProduct} />;

  return (
    <form onSubmit={submit} noValidate>
      <AdminPageHeader
        title={isEdit ? `Edit ${values.name}` : 'New product'}
        description={
          isEdit
            ? 'Changes go live for shoppers as soon as you save. Stock is validated against carts and orders.'
            : 'Add an item to the catalogue. Prices are in INR and include GST calculations at checkout.'
        }
        backTo="/admin/products"
        backLabel="All products"
        actions={
          <>
            {isEdit && (
              <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} icon={<Icon name="trash" className="h-4 w-4" />}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} icon={<Icon name="check" className="h-4 w-4" />}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <TabbedForm
            tabs={[
              {
                id: 'basics',
                label: 'Basics',
                content: (
                  <div className="space-y-4">
                    <Input label="Product name" required value={values.name} onChange={set('name')} error={errors.name} placeholder="Aether Noise-Cancelling Headphones" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Brand" required value={values.brand} onChange={set('brand')} error={errors.brand} placeholder="Aether" />
                      <Input
                        label="SKU"
                        required
                        value={values.SKU}
                        onChange={set('SKU')}
                        error={errors.SKU}
                        placeholder="AETH-NC-001"
                        hint="Unique stock keeping unit"
                      />
                    </div>
                    <Select
                      label="Category"
                      required
                      value={values.category}
                      onChange={set('category')}
                      error={errors.category}
                      placeholder="Choose a category"
                      options={categories.map((item) => ({ value: item._id, label: `${item.name} (${item.productCount} products)` }))}
                    />
                    <Textarea
                      label="Short description"
                      rows={2}
                      maxLength={260}
                      value={values.shortDescription}
                      onChange={set('shortDescription')}
                      placeholder="One line that sells it — shown on cards and search results."
                    />
                    <Textarea
                      label="Full description"
                      required
                      rows={8}
                      maxLength={6000}
                      value={values.description}
                      onChange={set('description')}
                      error={errors.description}
                      hint={`${(values.description || '').length}/6000 characters`}
                      placeholder="Materials, fit, warranty, what is in the box…"
                    />
                  </div>
                ),
              },
              {
                id: 'pricing',
                label: 'Pricing & stock',
                content: (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Price (₹)" required type="number" min="0" step="0.01" value={values.price} onChange={set('price')} error={errors.price} placeholder="12999" />
                      <Input
                        label="Discounted price (₹)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={values.discountPrice}
                        onChange={set('discountPrice')}
                        error={errors.discountPrice}
                        placeholder="Leave empty for no discount"
                        hint={discountPercent ? `Shoppers see ${discountPercent}% off` : 'Must be lower than the price'}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Stock"
                        required
                        type="number"
                        min="0"
                        value={values.stock}
                        onChange={set('stock')}
                        error={errors.stock}
                        disabled={values.variants.length > 0}
                        hint={values.variants.length ? 'Variant stock is used instead' : 'Units available to sell'}
                      />
                      <Input
                        label="Low stock threshold"
                        type="number"
                        min="0"
                        value={values.lowStockThreshold}
                        onChange={set('lowStockThreshold')}
                        hint="Triggers the low-stock badge and admin alert"
                      />
                    </div>

                    <Alert variant="info" title="Pricing rules are enforced server-side">
                      The total is always recalculated on the server from the live product price, discount, shipping and
                      GST — the browser cannot influence what the customer is charged.
                    </Alert>

                    <div className="flex flex-wrap gap-4 rounded-xl border border-ink-200 p-4">
                      <Checkbox label="Visible in storefront" description="Hidden products stay in the catalogue but cannot be bought" checked={values.isActive} onChange={set('isActive')} />
                      <Checkbox label="Featured" description="Appears in home page rails" checked={values.isFeatured} onChange={set('isFeatured')} />
                      <Checkbox label="New arrival" description="Shown in the new arrivals rail" checked={values.isNewArrival} onChange={set('isNewArrival')} />
                      <Checkbox label="Free shipping" description="Overrides the shipping tier for this item" checked={values.freeShipping} onChange={set('freeShipping')} />
                    </div>
                  </div>
                ),
              },
              {
                id: 'variants',
                label: `Variants${values.variants.length ? ` (${values.variants.length})` : ''}`,
                content: (
                  <div className="space-y-5">
                    <Alert variant="info" title="When do I need variants?">
                      Add one entry per orderable combination (colour, size, storage). Shoppers must pick a variant
                      before they can add the item to the cart.
                    </Alert>

                    {values.variants.length > 0 && (
                      <div className="space-y-3">
                        {values.variants.map((variant, index) => (
                          <div key={index} className="rounded-xl border border-ink-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-ink-900">{variant.name}</p>
                              <Button type="button" size="sm" variant="ghost" className="text-danger-600 hover:bg-danger-50" onClick={() => removeVariant(index)}>
                                Remove
                              </Button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <Input label="Colour" value={variant.color || ''} onChange={(event) => updateVariant(index, 'color', event.target.value)} placeholder="Midnight" />
                              <Input label="Size" value={variant.size || ''} onChange={(event) => updateVariant(index, 'size', event.target.value)} placeholder="M" />
                              <Input
                                label="Price adjustment (₹)"
                                type="number"
                                step="0.01"
                                value={variant.priceDelta}
                                onChange={(event) => updateVariant(index, 'priceDelta', event.target.value)}
                                hint="Added to the base price"
                              />
                              <Input
                                label="Stock"
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(event) => updateVariant(index, 'stock', event.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-dashed border-ink-300 p-4">
                      <p className="text-sm font-semibold text-ink-900">Add a variant</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Input
                          label="Variant name"
                          value={variantDraft.name}
                          onChange={(event) => setVariantDraft((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Midnight / M"
                        />
                        <Input
                          label="Colour"
                          value={variantDraft.color}
                          onChange={(event) => setVariantDraft((current) => ({ ...current, color: event.target.value }))}
                          placeholder="Midnight"
                        />
                        <Input
                          label="Size"
                          value={variantDraft.size}
                          onChange={(event) => setVariantDraft((current) => ({ ...current, size: event.target.value }))}
                          placeholder="M"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Price + (₹)"
                            type="number"
                            step="0.01"
                            value={variantDraft.priceDelta}
                            onChange={(event) => setVariantDraft((current) => ({ ...current, priceDelta: event.target.value }))}
                          />
                          <Input
                            label="Stock"
                            type="number"
                            min="0"
                            value={variantDraft.stock}
                            onChange={(event) => setVariantDraft((current) => ({ ...current, stock: event.target.value }))}
                          />
                        </div>
                      </div>
                      <Button type="button" className="mt-3" variant="outline" onClick={addVariant} icon={<Icon name="plus" className="h-4 w-4" />}>
                        Add variant
                      </Button>
                    </div>
                  </div>
                ),
              },
              {
                id: 'media',
                label: `Images (${values.images.length})`,
                content: (
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={imageDraft}
                        onChange={(event) => setImageDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addImage();
                          }
                        }}
                        placeholder="https://cdn.example.com/image.jpg"
                        aria-label="Image URL"
                        containerClassName="min-w-[16rem] flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => addImage()} icon={<Icon name="plus" className="h-4 w-4" />}>
                        Add URL
                      </Button>
                      <Button type="button" variant="ghost" onClick={addGeneratedImage} icon={<Icon name="sparkles" className="h-4 w-4" />}>
                        Generate artwork
                      </Button>
                    </div>

                    {values.images.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">
                        No images yet — generate placeholder artwork or paste a CDN URL. The first image is the card
                        thumbnail.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {values.images.map((image, index) => (
                          <li key={`${image}-${index}`} className="group relative overflow-hidden rounded-xl border border-ink-200">
                            <img src={image} alt={`Product image ${index + 1}`} className="h-32 w-full object-cover" />
                            {index === 0 && (
                              <Badge tone="brand" size="sm" className="absolute left-2 top-2">Primary</Badge>
                            )}
                            <div className="flex items-center justify-between gap-1 border-t border-ink-100 p-1.5">
                              {index > 0 ? (
                                <button
                                  type="button"
                                  className="rounded-lg px-2 py-1 text-2xs font-semibold text-ink-600 hover:bg-ink-100"
                                  onClick={() =>
                                    setValues((current) => {
                                      const next = [...current.images];
                                      next.splice(index, 1);
                                      next.unshift(image);
                                      return { ...current, images: next };
                                    })
                                  }
                                >
                                  Make primary
                                </button>
                              ) : (
                                <span className="px-2 py-1 text-2xs text-ink-400">Card image</span>
                              )}
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                                aria-label={`Remove image ${index + 1}`}
                                onClick={() => setValues((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }))}
                              >
                                <Icon name="trash" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              },
              {
                id: 'details',
                label: 'Details',
                content: (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Specifications</p>
                      <div className="mt-3 space-y-2.5">
                        {values.specifications.map((spec, index) => (
                          <div key={`${spec.key}-${index}`} className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-2">
                            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-500">{spec.key}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{spec.value}</span>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                              aria-label={`Remove ${spec.key}`}
                              onClick={() => setValues((current) => ({ ...current, specifications: current.specifications.filter((_, i) => i !== index) }))}
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <Input
                          label="Key"
                          value={specDraft.key}
                          onChange={(event) => setSpecDraft((current) => ({ ...current, key: event.target.value }))}
                          placeholder="Battery life"
                          containerClassName="w-40"
                        />
                        <Input
                          label="Value"
                          value={specDraft.value}
                          onChange={(event) => setSpecDraft((current) => ({ ...current, value: event.target.value }))}
                          placeholder="38 hours"
                          containerClassName="min-w-[12rem] flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (!specDraft.key.trim() || !specDraft.value.trim()) {
                              toast.error('Both a key and a value are required');
                              return;
                            }
                            setValues((current) => ({ ...current, specifications: [...current.specifications, { ...specDraft }] }));
                            setSpecDraft({ key: '', value: '' });
                          }}
                          icon={<Icon name="plus" className="h-4 w-4" />}
                        >
                          Add spec
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink-900">Tags</p>
                      <p className="mt-1 text-xs text-ink-500">Tags power search and related products.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {values.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setValues((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-danger-50 hover:text-danger-600"
                          >
                            {tag}
                            <Icon name="x" className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-3">
                        <Input
                          value={tagDraft}
                          onChange={(event) => setTagDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              const tag = tagDraft.trim().toLowerCase();
                              if (tag && !values.tags.includes(tag)) {
                                setValues((current) => ({ ...current, tags: [...current.tags, tag] }));
                              }
                              setTagDraft('');
                            }
                          }}
                          placeholder="wireless"
                          aria-label="Add tag"
                          containerClassName="max-w-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const tag = tagDraft.trim().toLowerCase();
                            if (tag && !values.tags.includes(tag)) {
                              setValues((current) => ({ ...current, tags: [...current.tags, tag] }));
                            }
                            setTagDraft('');
                          }}
                        >
                          Add tag
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* Live preview */}
        <div className="space-y-6">
          <ChartCard title="Storefront preview" description="How the product card will read">
            <div className="overflow-hidden rounded-2xl border border-ink-200">
              <img src={previewImage} alt="Product preview" className="h-56 w-full object-cover" />
              <div className="p-4">
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{values.brand || 'Brand'}</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900">{values.name || 'Product name'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg font-bold text-ink-900">{formatMoney(sellingPrice)}</span>
                  {discountPercent > 0 && (
                    <>
                      <span className="text-sm text-ink-400 line-through">{formatMoney(Number(values.price) || 0)}</span>
                      <Badge tone="danger" size="sm">{discountPercent}% off</Badge>
                    </>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs text-ink-500">
                  <Badge tone={effectiveStock > 0 ? (effectiveStock <= (Number(values.lowStockThreshold) || 10) ? 'warning' : 'success') : 'danger'} size="sm">
                    {effectiveStock > 0 ? `${effectiveStock} in stock` : 'Out of stock'}
                  </Badge>
                  {values.variants.length > 0 && <span>{values.variants.length} variants</span>}
                  {!values.isActive && <Badge tone="neutral" size="sm">Hidden</Badge>}
                </div>
              </div>
            </div>
          </ChartCard>

          {isEdit && (
            <ChartCard title="Record info" description="Server-side identifiers">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Slug</dt>
                  <dd className="truncate font-mono text-xs text-ink-800">{values.slug || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Created</dt>
                  <dd className="text-xs text-ink-800">{values.createdAt ? new Date(values.createdAt).toLocaleString('en-IN') : '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Units sold</dt>
                  <dd className="text-xs text-ink-800">{values.sold ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Rating</dt>
                  <dd className="text-xs text-ink-800">
                    {values.rating ? `${values.rating.toFixed(1)}★ from ${values.numReviews} reviews` : 'No reviews yet'}
                  </dd>
                </div>
              </dl>
            </ChartCard>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={destroy}
        loading={deleting}
        title="Delete this product?"
        confirmLabel="Delete product"
      >
        <p className="text-sm text-ink-600">
          Products that appear in past orders are archived (deactivated) so invoices stay accurate. Otherwise the
          document, its reviews and wishlist references are removed permanently.
        </p>
      </ConfirmDialog>
    </form>
  );
}
