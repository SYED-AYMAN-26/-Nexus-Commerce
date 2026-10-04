import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useLockBodyScroll } from '../../hooks';

/**
 * Slide-over panel. Used for the cart drawer (right) and the mobile menu (left).
 */
export function Drawer({ open, onClose, title, side = 'right', children, footer, width = 'max-w-md' }) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} flex h-full w-full ${width} flex-col bg-white shadow-popover
                    ${side === 'right' ? 'animate-slide-in-right' : 'animate-fade-in'}`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <h2 className="truncate text-base font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin">{children}</div>

        {footer && <footer className="safe-bottom border-t border-ink-100 bg-white px-5 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}

export default Drawer;
