import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon';

const ToastContext = createContext(null);
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const VARIANTS = {
  success: { icon: 'check-circle', className: 'border-success-200 bg-white', iconClass: 'bg-success-100 text-success-700' },
  error: { icon: 'alert-circle', className: 'border-danger-200 bg-white', iconClass: 'bg-danger-100 text-danger-700' },
  warning: { icon: 'alert-triangle', className: 'border-warning-200 bg-white', iconClass: 'bg-warning-100 text-warning-700' },
  info: { icon: 'info', className: 'border-ink-200 bg-white', iconClass: 'bg-brand-50 text-brand-700' },
};

/**
 * Global toast notifications.
 * Toasts stack bottom-right on desktop and top-centre on mobile so they never
 * cover the sticky "add to cart" bar.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      const id = (idRef.current += 1);
      const variant = options.variant || 'success';
      const duration = options.duration ?? 4200;

      setToasts((current) => {
        const next = [...current, { id, message, variant, title: options.title, action: options.action }];
        return next.slice(-4); // never stack more than four
      });

      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      toast,
      dismiss,
      success: (message, options) => toast(message, { ...options, variant: 'success' }),
      error: (message, options) => toast(message, { ...options, variant: 'error' }),
      warning: (message, options) => toast(message, { ...options, variant: 'warning' }),
      info: (message, options) => toast(message, { ...options, variant: 'info' }),
      /** Fire a toast for any thrown error - used in catch blocks. */
      fromError: (error, fallback = 'Something went wrong') => toast(error?.message || fallback, { variant: 'error' }),
    }),
    [toast, dismiss],
  );

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3
                   sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:items-end sm:px-0"
      >
        {toasts.map((item) => {
          const variant = VARIANTS[item.variant] || VARIANTS.info;
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-3 rounded-2xl border
                          p-3.5 shadow-popover ${variant.className}`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${variant.iconClass}`}>
                <Icon name={variant.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                {item.title && <p className="text-sm font-semibold text-ink-900">{item.title}</p>}
                <p className="text-sm leading-snug text-ink-600">{item.message}</p>
                {item.action && (
                  <button type="button" onClick={item.action.onClick} className="mt-2 text-sm font-semibold text-brand-600 hover:underline">
                    {item.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-lg p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
