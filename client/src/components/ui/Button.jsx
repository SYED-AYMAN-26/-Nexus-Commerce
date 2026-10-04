import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from './Icon';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  success: 'btn-success',
  subtle: 'btn-subtle',
};

const SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

/**
 * Single button primitive used everywhere.
 * Renders a <Link> when `to` is provided and an <a> for external hrefs, so the
 * correct element is always used for the action.
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
    iconRight,
    to,
    href,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    'btn',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
      {!loading && iconRight}
    </>
  );

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className={classes} ref={ref} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !disabled && !loading) {
    return (
      <a href={href} className={classes} ref={ref} target="_blank" rel="noreferrer" {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={rest.type || 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      ref={ref}
      {...rest}
    >
      {content}
    </button>
  );
});

/** Circular icon-only action button (wishlist heart, table row actions). */
export const IconButton = forwardRef(function IconButton(
  { label, variant = 'ghost', size = 'icon', className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`btn ${VARIANTS[variant]} ${SIZES[size]} rounded-full ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
