import { Icon } from './Icon';
import { ORDER_STATUS, PAYMENT_STATUS, STOCK_STATUS } from '../../utils/constants';

/** Generic badge with design-system tones. */
export function Badge({ children, tone = 'neutral', size = 'md', icon, className = '', dot = false }) {
  const tones = {
    neutral: 'badge-neutral',
    brand: 'badge-brand',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    dark: 'badge-dark',
  };
  const sizes = { sm: 'px-2 py-0.5 text-[10px]', md: 'badge', lg: 'px-3 py-1.5 text-xs' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide
                      ${sizes[size]} ${tones[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon && <Icon name={icon} className="h-3 w-3" />}
      {children}
    </span>
  );
}

export const OrderStatusBadge = ({ status, size = 'md', className = '' }) => {
  const meta = ORDER_STATUS[status] || ORDER_STATUS.pending;
  return (
    <Badge tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </Badge>
  );
};

export const PaymentStatusBadge = ({ status, size = 'md', className = '' }) => {
  const meta = PAYMENT_STATUS[status] || PAYMENT_STATUS.pending;
  return (
    <Badge tone={meta.tone} size={size} className={className}>
      {meta.label}
    </Badge>
  );
};

export const StockBadge = ({ status, stock, size = 'md', className = '' }) => {
  const meta = STOCK_STATUS[status] || STOCK_STATUS.in_stock;
  const label = status === 'in_stock' && stock ? `In stock · ${stock}` : meta.label;
  return (
    <Badge tone={meta.tone} size={size} className={className}>
      {label}
    </Badge>
  );
};

/** "-32%" pill shown on discounted product cards. */
export function DiscountBadge({ percentage, className = '' }) {
  if (!percentage) return null;
  return (
    <span className={`rounded-lg bg-danger-600 px-2 py-1 text-2xs font-bold uppercase tracking-wide text-white shadow-sm ${className}`}>
      -{percentage}%
    </span>
  );
}

export default Badge;
