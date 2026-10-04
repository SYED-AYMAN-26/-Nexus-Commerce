import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../services';
import { Breadcrumbs } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Modal';
import { RatingStars } from '../../components/ui/Rating';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { formatDate } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

export default function MyReviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productApi.myReviews();
      setReviews(data.reviews || []);
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

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await productApi.deleteReview(deleting.product._id, deleting._id);
      setReviews((current) => current.filter((review) => review._id !== deleting._id));
      toast.success('Review deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account', to: '/account' }, { label: 'Reviews' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">My reviews</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {reviews.length
              ? `${reviews.length} review${reviews.length === 1 ? '' : 's'} written · ${average} average rating`
              : 'Share what you think about the products you have received.'}
          </p>
        </div>
        <Button to="/account/orders" variant="outline" icon={<Icon name="orders" className="h-4 w-4" />}>
          Review a purchase
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />

        <div className="min-w-0">
          {error ? (
            <ErrorState error={error} onRetry={load} />
          ) : loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/40">
              <EmptyState
                icon="star"
                title="No reviews yet"
                description="Delivered orders let you rate and review every purchase — it helps other shoppers decide."
                action={<Button to="/account/orders">Go to my orders</Button>}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article key={review._id} className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-4 sm:flex-row sm:p-5">
                  <Link to={`/product/${review.product?.slug}#reviews`} className="shrink-0">
                    <img
                      src={review.product?.images?.[0] || '/api/media/banners/nexus.svg'}
                      alt={review.product?.name || 'Product'}
                      className="h-28 w-28 rounded-xl border border-ink-200 object-cover"
                      loading="lazy"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/product/${review.product?.slug}#reviews`}
                          className="line-clamp-2 font-semibold text-ink-900 transition hover:text-brand-700"
                        >
                          {review.product?.name || 'Product removed'}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          <RatingStars value={review.rating} size="sm" />
                          <span className="text-xs text-ink-500">Reviewed {formatDate(review.createdAt)}</span>
                          {review.isVerifiedPurchase && (
                            <Badge tone="success" size="sm" icon="check">
                              Verified purchase
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          to={`/product/${review.product?.slug}#reviews`}
                          size="sm"
                          variant="ghost"
                          icon={<Icon name="edit" className="h-3.5 w-3.5" />}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger-600 hover:bg-danger-50"
                          onClick={() => setDeleting(review)}
                          icon={<Icon name="trash" className="h-3.5 w-3.5" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {review.title && <p className="mt-3 text-sm font-semibold text-ink-800">{review.title}</p>}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{review.comment}</p>

                    {review.helpfulCount > 0 && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                        <Icon name="checkCircle" className="h-3.5 w-3.5" />
                        {review.helpfulCount} shopper{review.helpfulCount === 1 ? '' : 's'} found this helpful
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this review?"
        confirmLabel="Delete review"
      >
        <p className="text-sm text-ink-600">
          Your rating and comment will be removed from the product page. You can write a new review afterwards.
        </p>
      </ConfirmDialog>
    </div>
  );
}
