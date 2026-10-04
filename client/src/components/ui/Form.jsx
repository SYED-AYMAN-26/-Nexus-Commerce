import { forwardRef, useId, useState } from 'react';
import { Icon } from './Icon';

/** Wrapper providing label, required marker, hint and error text. */
export function FormField({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="error-text">
          <Icon name="alert-circle" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </div>
  );
}

/** Text-like input with optional leading icon and password reveal. */
export const Input = forwardRef(function Input(
  { label, error, hint, icon, trailing, className = '', containerClassName = '', type = 'text', required, ...rest },
  ref,
) {
  const id = useId();
  const inputId = rest.id || id;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && revealed ? 'text' : type;

  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={containerClassName}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          type={resolvedType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`input ${error ? 'input-error' : ''} ${icon ? 'pl-10' : ''} ${isPassword || trailing ? 'pr-11' : ''} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} className="h-4 w-4" />
          </button>
        )}
        {!isPassword && trailing && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400">{trailing}</span>
        )}
      </div>
    </FormField>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', containerClassName = '', rows = 4, required, ...rest },
  ref,
) {
  const id = useId();
  const inputId = rest.id || id;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={containerClassName}>
      <textarea
        id={inputId}
        ref={ref}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`input resize-y leading-relaxed ${error ? 'input-error' : ''} ${className}`}
        {...rest}
      />
    </FormField>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className = '', containerClassName = '', required, children, ...rest },
  ref,
) {
  const id = useId();
  const inputId = rest.id || id;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={containerClassName}>
      <select
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`select ${error ? 'input-error' : ''} ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </FormField>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, description, error, className = '', ...rest }, ref) {
  const id = useId();
  const inputId = rest.id || id;
  return (
    <div className={className}>
      <div className="flex items-start gap-2.5">
        <input id={inputId} ref={ref} type="checkbox" className="checkbox mt-0.5" {...rest} />
        {label && (
          <label htmlFor={inputId} className="cursor-pointer select-none text-sm text-ink-700">
            {label}
            {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
          </label>
        )}
      </div>
      {error && (
        <p className="error-text">
          <Icon name="alert-circle" className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

export const Radio = forwardRef(function Radio({ label, description, className = '', ...rest }, ref) {
  const id = useId();
  const inputId = rest.id || id;
  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition
                  ${rest.checked ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50'} ${className}`}
    >
      <input id={inputId} ref={ref} type="radio" className="mt-0.5 h-4 w-4 border-ink-300 text-brand-600 focus:ring-brand-500/30" {...rest} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  );
});

/** Inline alert used for form-level failures and page notices. */
export function Alert({ variant = 'info', title, children, onDismiss, className = '', actions }) {
  const styles = {
    info: { wrap: 'bg-brand-50 border-brand-200 text-brand-900', icon: 'info', iconColor: 'text-brand-600' },
    success: { wrap: 'bg-success-50 border-success-100 text-success-700', icon: 'check-circle', iconColor: 'text-success-600' },
    warning: { wrap: 'bg-warning-50 border-warning-100 text-warning-700', icon: 'alert-triangle', iconColor: 'text-warning-600' },
    error: { wrap: 'bg-danger-50 border-danger-100 text-danger-700', icon: 'alert-circle', iconColor: 'text-danger-600' },
  }[variant] || {};

  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm ${styles.wrap} ${className}`}>
      <Icon name={styles.icon} className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${styles.iconColor}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="rounded-lg p-1 opacity-60 transition hover:opacity-100" aria-label="Dismiss">
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default Input;
