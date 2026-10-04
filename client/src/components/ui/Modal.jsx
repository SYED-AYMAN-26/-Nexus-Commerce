import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Button } from './Button';
import { useLockBodyScroll } from '../../hooks';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

/** Accessible modal dialog rendered in a portal. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', closeOnOverlay = true, className = '' }) {
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
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`relative z-10 w-full ${SIZES[size]} animate-scale-in overflow-hidden rounded-t-3xl bg-white shadow-popover
                    sm:rounded-2xl ${className}`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-ink-900 sm:text-lg">{title}</h2>}
              {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto scroll-thin px-5 py-5 sm:px-6">{children}</div>

        {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmation dialog for destructive actions (remove item, delete product,
 * delete address, cancel order…).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
      title={
        <span className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 place-items-center rounded-full ${variant === 'danger' ? 'bg-danger-100 text-danger-600' : 'bg-brand-50 text-brand-600'}`}>
            <Icon name={variant === 'danger' ? 'alert-triangle' : 'info'} className="h-4 w-4" />
          </span>
          {title}
        </span>
      }
    >
      {children || <p className="text-sm leading-relaxed text-ink-600">{message}</p>}
    </Modal>
  );
}

export default Modal;
