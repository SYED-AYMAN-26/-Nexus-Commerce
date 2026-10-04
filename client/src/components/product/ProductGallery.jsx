import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';

/**
 * Product image gallery.
 * Desktop shows a thumbnail strip next to a large image; mobile becomes a
 * swipeable carousel with dot indicators. Arrow keys work on desktop.
 */
export function ProductGallery({ images = [], name = '', badges = [], discountPercentage = 0, className = '' }) {
  const gallery = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const trackRef = useRef(null);

  useEffect(() => {
    setActive(0);
  }, [images]);

  if (!gallery.length) {
    return (
      <div className={`grid aspect-square place-items-center rounded-2xl bg-ink-100 text-ink-400 ${className}`}>
        <Icon name="image" className="h-12 w-12" />
      </div>
    );
  }

  const go = (index) => setActive((index + gallery.length) % gallery.length);

  const onMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') go(active + 1);
    if (event.key === 'ArrowLeft') go(active - 1);
  };

  return (
    <div className={`flex flex-col gap-4 lg:flex-row ${className}`}>
      {/* Thumbnails — vertical on desktop, hidden on mobile (dots instead) */}
      {gallery.length > 1 && (
        <div className="order-2 flex gap-3 overflow-x-auto no-scrollbar lg:order-1 lg:flex-col lg:overflow-visible">
          {gallery.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1} of ${gallery.length}`}
              aria-current={index === active}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-ink-50 transition
                          lg:h-20 lg:w-20 ${index === active ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-ink-200 hover:border-ink-300'}`}
            >
              <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="order-1 flex-1 lg:order-2">
        <div
          ref={trackRef}
          role="group"
          aria-label={`${name} image gallery`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={onMouseMove}
          className="relative aspect-square overflow-hidden rounded-2xl border border-ink-200 bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <img
            key={gallery[active]}
            src={gallery[active]}
            alt={`${name} — view ${active + 1}`}
            className="h-full w-full animate-fade-in object-cover transition-transform duration-300"
            style={zoom ? { transform: 'scale(1.7)', transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
          />

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {discountPercentage > 0 && <Badge tone="danger" size="md">-{discountPercentage}% off</Badge>}
            {badges?.slice(0, 2).map((badge) => (
              <Badge key={badge} tone="dark" size="sm">{badge}</Badge>
            ))}
          </div>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-700
                           shadow-sm backdrop-blur transition hover:bg-white lg:opacity-0 lg:group-hover:opacity-100"
              >
                <Icon name="chevronLeft" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-700
                           shadow-sm backdrop-blur transition hover:bg-white lg:opacity-0 lg:group-hover:opacity-100"
              >
                <Icon name="chevronRight" className="h-5 w-5" />
              </button>
            </>
          )}

          <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/70 px-2.5 py-1 text-2xs font-medium text-white backdrop-blur">
            {active + 1} / {gallery.length}
          </span>
        </div>

        {/* Mobile dots */}
        {gallery.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
            {gallery.map((image, index) => (
              <button
                key={`dot-${image}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Go to image ${index + 1}`}
                className={`h-2 rounded-full transition-all ${index === active ? 'w-6 bg-brand-600' : 'w-2 bg-ink-300'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductGallery;
