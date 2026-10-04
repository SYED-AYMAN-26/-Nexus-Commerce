import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { Alert, Input, Textarea } from '../ui/Form';
import { RatingBreakdown, RatingInput, RatingStars } from '../ui/Rating';
import { EmptyState } from '../ui/Feedback';
import { formatRelativeTime, initials } from '../../utils/format';
import { validateReview } from '../../utils/validation';
import { productApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

/** Single review card. */
function ReviewCard({ review, onDelete, canDelete }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.comment?.length > 320;
  const text = long && !expanded ? `${review.comment.slice(0, 320)}…` : review.comment;

  return (
    <article className="border-b border-ink-100 py-5 last:border-0">
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
          {initials(review.user?.name || 'Customer')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink-900">{review.user?.name || 'Verified customer'}</span>
            {review.isVerifiedPurchase && (
              <Badge tone="success" size="sm" icon="check">Verified purchase</Badge>
            )}
            <span className="text-xs text-ink-400">{formatRelativeTime(review.createdAt)}</span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <RatingStars value={review.rating} size="sm" />
            {review.title && <p className="text-sm font-semibold text-ink-800">{review.title}</p>}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-ink-600">{text}</p>
          {long && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1.5 text-xs font-semibold text-brand-600 hover:underline">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(review)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
              Delete review
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Review submission form - only reachable by verified purchasers. */
function ReviewForm({ productId, onSubmitted }) {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [values, setValues] = useState({ rating: 0, title: '', comment: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <Alert variant="info" title="Sign in to write a review">
        Only customers who purchased this product can leave a review.{' '}
        <Link to="/login" className="font-semibold underline">Sign in</Link> to continue.
      </Alert>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const { valid, errors: validationErrors } = validateReview(values);
    setErrors(validationErrors);
    if (!valid) return;

    setSubmitting(true);
    try {
      const { review } = await productApi.createReview(productId, values);
      toast.success('Thanks! Your review has been published.');
      setValues({ rating: 0, title: '', comment: '' });
      onSubmitted?.(review);
    } catch (error) {
      if (error.errors?.length) {
        setErrors(Object.fromEntries(error.errors.map((e) => [e.field, e.message])));
      }
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
      <h3 className="text-base font-semibold text-ink-900">Write a review</h3>
      <p className="mt-1 text-sm text-ink-500">Your feedback helps other shoppers decide.</p>

      <div className="mt-5 space-y-4">
        <RatingInput value={values.rating} onChange={(rating) => setValues((v) => ({ ...v, rating }))} error={errors.rating} />
        <Input
          label="Review title"
          placeholder="Summarise your experience"
          maxLength={120}
          value={values.title}
          onChange={(event) => setValues((v) => ({ ...v, title: event.target.value }))}
        />
        <Textarea
          label="Your review"
          required
          rows={5}
          maxLength={1200}
          placeholder="What did you like or dislike? How was the quality?"
          value={values.comment}
          error={errors.comment}
          onChange={(event) => setValues((v) => ({ ...v, comment: event.target.value }))}
          hint={`${values.comment.length}/1200 characters`}
        />
        <Button type="submit" loading={submitting} icon={<Icon name="send" className="h-4 w-4" />}>
          Submit review
        </Button>
      </div>
    </form>
  );
}

/**
 * Full reviews block for the product detail page: summary, distribution,
 * list and the (guarded) submission form.
 */
export function ProductReviews({
  productId,
  reviews = [],
  summary,
  canReview = false,
  userReview = null,
  onReviewAdded,
  className = '',
}) {
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const [activeRating, setActiveRating] = useState(null);
  const [list, setList] = useState(reviews);

  const filtered = activeRating ? list.filter((review) => review.rating === activeRating) : list;

  const handleDelete = async (review) => {
    try {
      await productApi.deleteReview(productId, review._id);
      setList((current) => current.filter((item) => item._id !== review._id));
      toast.success('Review deleted');
    } catch (error) {
      toast.error(error.message || 'Could not delete that review');
    }
  };

  return (
    <section className={className} id="reviews">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Ratings & reviews</h2>
          <p className="mt-1 text-sm text-ink-500">Verified reviews from customers who bought this product.</p>
        </div>
        {summary?.total > 0 && (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <RatingStars value={summary.average} size="sm" showValue />
            <span>· {summary.total} review{summary.total === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      {summary?.total > 0 && (
        <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
          <RatingBreakdown breakdown={summary.breakdown} total={summary.total} average={summary.average} />
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-5">
            <button
              type="button"
              onClick={() => setActiveRating(null)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition
                          ${!activeRating ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'}`}
            >
              All reviews
            </button>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.breakdown?.[star] || 0;
              if (!count) return null;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setActiveRating(activeRating === star ? null : star)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition
                              ${activeRating === star ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'}`}
                >
                  {star}★ · {count}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          {filtered.length > 0 ? (
            <div>
              {filtered.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  canDelete={isAuthenticated && (String(review.user?._id) === String(user?._id) || user?.role === 'admin')}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="star"
              title={activeRating ? `No ${activeRating}-star reviews yet` : 'No reviews yet'}
              description={
                activeRating
                  ? 'Try a different rating filter, or be the first to review this product.'
                  : 'Be the first to share your experience with this product.'
              }
              action={
                activeRating ? (
                  <Button variant="outline" size="sm" onClick={() => setActiveRating(null)}>
                    Show all reviews
                  </Button>
                ) : null
              }
            />
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {userReview ? (
            <Alert variant="success" title="You have reviewed this product">
              Thanks for sharing your feedback. Reviews cannot be edited once published.
            </Alert>
          ) : canReview ? (
            <ReviewForm productId={productId} onSubmitted={(review) => { setList((current) => [review, ...current]); onReviewAdded?.(review); }} />
          ) : (
            <Alert variant="info" title="Only verified buyers can review">
              Reviews can be written after a delivered order containing this product. This keeps ratings trustworthy.
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductReviews;
