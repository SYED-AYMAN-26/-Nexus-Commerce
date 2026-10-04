import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services';
import { AdminPageHeader, AdminToolbar, StatTile } from '../../components/admin/AdminParts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input, Select } from '../../components/ui/Form';
import { ConfirmDialog } from '../../components/ui/Modal';
import { DataTable, Tabs } from '../../components/ui/Misc';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/Feedback';
import { RatingStars } from '../../components/ui/Rating';
import { formatDateTime, initials } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks';

const STATUS_TABS = [
  { value: '', label: 'All reviews' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminReviews() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const status = params.get('status') || '';
  const rating = params.get('rating') || '';

  const [search, setSearch] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.reviews({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
        rating: rating || undefined,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, rating]);

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

  const moderate = async (review, nextStatus) => {
    setBusyId(review._id);
    try {
      await adminApi.moderateReview(review._id, { status: nextStatus });
      toast.success(nextStatus === 'published' ? 'Review published' : `Review marked ${nextStatus}`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteReview(deleteTarget._id);
      toast.success('Review deleted and product rating recalculated');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const reviews = data?.reviews || [];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const verified = reviews.filter((review) => review.isVerifiedPurchase).length;

  const columns = [
    {
      key: 'review',
      header: 'Review',
      render: (review) => (
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <RatingStars value={review.rating} size="xs" />
            {review.isVerifiedPurchase && <Badge tone="success" size="sm">Verified</Badge>}
          </div>
          {review.title && <p className="mt-1 text-sm font-semibold text-ink-900">{review.title}</p>}
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-600">{review.comment}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (review) => (
        <div className="min-w-0">
          <Link to={`/product/${review.product?.slug}`} className="line-clamp-2 text-sm font-medium text-brand-700 hover:underline">
            {review.product?.name || 'Deleted product'}
          </Link>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      render: (review) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-2xs font-bold text-ink-700">
            {initials(review.user?.name || 'A')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-800">{review.user?.name || 'Deleted user'}</p>
            <p className="truncate text-2xs text-ink-500">{review.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (review) => (
        <div>
          <Badge
            tone={review.status === 'published' ? 'success' : review.status === 'pending' ? 'warning' : 'neutral'}
            size="sm"
            dot
          >
            {review.status}
          </Badge>
          <p className="mt-1 text-2xs text-ink-500">{formatDateTime(review.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (review) => (
        <div className="flex justify-end gap-1.5">
          {review.status !== 'published' && (
            <Button size="sm" variant="outline" loading={busyId === review._id} onClick={() => moderate(review, 'published')}>
              Publish
            </Button>
          )}
          {review.status === 'published' && (
            <Button size="sm" variant="ghost" loading={busyId === review._id} onClick={() => moderate(review, 'hidden')}>
              Hide
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-danger-600 hover:bg-danger-50"
            onClick={() => setDeleteTarget(review)}
            aria-label="Delete review"
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
        title="Reviews"
        description="Moderate customer feedback. Ratings shown on products are recalculated from published reviews only."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile label="Reviews matching" value={data?.pagination.total ?? 0} icon="star" tone="brand" />
        <StatTile label="Average rating" value={average ? average.toFixed(2) : '—'} hint="on this page" icon="activity" tone="warning" />
        <StatTile label="Verified purchases" value={verified} hint="on this page" icon="checkCircle" tone="success" />
      </div>

      <Tabs tabs={STATUS_TABS} value={status} onChange={(value) => updateParams({ status: value || undefined, page: 1 })} className="mb-5" />

      <AdminToolbar className="mb-5">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); updateParams({ search: event.target.value || undefined, page: 1 }); }}
          placeholder="Search review text"
          aria-label="Search reviews"
          icon={<Icon name="search" className="h-4 w-4" />}
          containerClassName="min-w-[15rem] flex-1"
        />
        <Select
          value={rating}
          onChange={(event) => updateParams({ rating: event.target.value || undefined, page: 1 })}
          options={[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} star${value === 1 ? '' : 's'}` }))}
          placeholder="Any rating"
          aria-label="Filter by rating"
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
            rows={reviews}
            emptyState={
              <div className="rounded-2xl border border-dashed border-ink-300 bg-white">
                <EmptyState icon="star" title="No reviews match these filters" description="Reviews appear here as soon as customers submit them." />
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this review?"
        confirmLabel="Delete review"
      >
        <p className="text-sm text-ink-600">
          The review is removed permanently and the product&apos;s rating and review count are recalculated immediately.
        </p>
      </ConfirmDialog>
    </>
  );
}
