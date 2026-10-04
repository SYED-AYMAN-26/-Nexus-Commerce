import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services';
import { AdminPageHeader } from '../../components/admin/AdminParts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Checkbox, Input, Textarea } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { useToast } from '../../context/ToastContext';

const slugify = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

const EMPTY = { name: '', description: '', image: '', icon: 'tag', featured: false, displayOrder: '0' };

export default function AdminCategories() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [force, setForce] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.categories();
      setCategories(result.categories || []);
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
    setFormOpen(true);
    setValues({ ...EMPTY, displayOrder: String(categories.length + 1) });
    setErrors({});
  };

  const openEdit = (category) => {
    setEditing(category);
    setFormOpen(true);
    setValues({
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      icon: category.icon || 'tag',
      featured: category.featured,
      displayOrder: String(category.displayOrder ?? 0),
    });
    setErrors({});
  };

  const close = () => {
    setFormOpen(false);
    setEditing(null);
    setValues(EMPTY);
    setErrors({});
  };

  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (values.name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      image: values.image.trim() || `/api/media/categories/${slugify(values.name)}.svg`,
      icon: values.icon,
      featured: values.featured,
      displayOrder: Number(values.displayOrder) || 0,
    };

    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateCategory(editing._id, payload);
        toast.success('Category updated');
      } else {
        await adminApi.createCategory(payload);
        toast.success('Category created');
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

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteCategory(deleteTarget._id, force);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setForce(false);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Categories drive the storefront navigation, filters and the category performance report."
        actions={
          <Button onClick={openCreate} icon={<Icon name="plus" className="h-4 w-4" />}>
            New category
          </Button>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
          <EmptyState
            icon="tag"
            title="No categories yet"
            description="Create your first category so products can be grouped and filtered."
            action={<Button onClick={openCreate}>New category</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category._id} className="group overflow-hidden rounded-2xl border border-ink-200 bg-white transition hover:shadow-card-hover">
              <div className="relative h-36 overflow-hidden bg-ink-100">
                <img
                  src={category.image || `/api/media/categories/${category.slug}.svg`}
                  alt={category.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {category.featured && <Badge tone="brand" size="sm">Featured</Badge>}
                  {!category.isActive && <Badge tone="neutral" size="sm">Hidden</Badge>}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-ink-900">{category.name}</h2>
                    <p className="font-mono text-2xs text-ink-500">/{category.slug}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700">
                    <Icon name={category.icon || 'tag'} className="h-4 w-4" />
                  </span>
                </div>

                {category.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-600">{category.description}</p>}

                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink-500">
                  <div className="flex gap-1">
                    <dt>Products:</dt>
                    <dd className="font-semibold text-ink-800">{category.productCount}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Units:</dt>
                    <dd className="font-semibold text-ink-800">{category.totalStock}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Order:</dt>
                    <dd className="font-semibold text-ink-800">{category.displayOrder}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(category)} icon={<Icon name="edit" className="h-3.5 w-3.5" />}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" to={`/category/${category.slug}`} icon={<Icon name="eye" className="h-3.5 w-3.5" />}>
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-danger-600 hover:bg-danger-50"
                    onClick={() => { setDeleteTarget(category); setForce(false); }}
                    icon={<Icon name="trash" className="h-3.5 w-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={close}
        size="lg"
        title={editing ? `Edit ${editing.name}` : 'New category'}
        description="The slug is generated from the name and used in storefront URLs."
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          <Input
            label="Name"
            required
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            error={errors.name}
            placeholder="Audio"
          />
          <Textarea
            label="Description"
            rows={3}
            maxLength={400}
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="Headphones, earbuds, speakers and everything in between."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Image URL"
              value={values.image}
              onChange={(event) => setValues((current) => ({ ...current, image: event.target.value }))}
              placeholder="Leave empty to use generated artwork"
              hint={`/api/media/categories/${slugify(values.name) || 'category'}.svg`}
            />
            <Input
              label="Icon name"
              value={values.icon}
              onChange={(event) => setValues((current) => ({ ...current, icon: event.target.value }))}
              placeholder="tag"
              hint="Any icon key, e.g. headphones, box, tag, gift"
            />
          </div>
          <Input
            label="Display order"
            type="number"
            value={values.displayOrder}
            onChange={(event) => setValues((current) => ({ ...current, displayOrder: event.target.value }))}
            hint="Lower numbers appear first in navigation"
          />
          <Checkbox
            label="Featured category"
            description="Highlight on the home page"
            checked={values.featured}
            onChange={(event) => setValues((current) => ({ ...current, featured: event.target.checked }))}
          />

          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
            <Button type="button" variant="outline" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save category' : 'Create category'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => { setDeleteTarget(null); setForce(false); }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this category?"
        confirmLabel="Delete category"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              <span className="font-semibold text-ink-900">{deleteTarget.name}</span> currently holds{' '}
              {deleteTarget.productCount} product(s). Categories in use cannot be deleted unless you force it.
            </p>
            <label className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50/60 p-3 text-xs text-danger-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-danger-300 text-danger-600"
                checked={force}
                onChange={(event) => setForce(event.target.checked)}
              />
              Force delete — products in this category are archived and left uncategorised.
            </label>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
