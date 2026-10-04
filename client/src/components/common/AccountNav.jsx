import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

const LINKS = [
  { to: '/account', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/account/orders', label: 'My orders', icon: 'orders' },
  { to: '/account/wishlist', label: 'Wishlist', icon: 'heart' },
  { to: '/account/addresses', label: 'Addresses', icon: 'mapPin' },
  { to: '/account/reviews', label: 'My reviews', icon: 'star' },
  { to: '/account/edit', label: 'Profile settings', icon: 'settings' },
];

/** Sidebar used by every page under /account. */
export function AccountNav() {
  const { user, isAdmin, wishlistCount } = useAuth();

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
            {initials(user?.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
            <p className="truncate text-xs text-ink-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <nav className="mt-4 space-y-1 rounded-2xl border border-ink-200 bg-white p-2" aria-label="Account sections">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                                          ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}
          >
            <Icon name={link.icon} className="h-4 w-4" />
            <span className="flex-1">{link.label}</span>
            {link.to === '/account/wishlist' && wishlistCount > 0 && (
              <span className="rounded-full bg-danger-100 px-1.5 py-0.5 text-2xs font-bold text-danger-700">{wishlistCount}</span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            className="mt-1 flex items-center gap-3 rounded-xl bg-ink-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            <Icon name="shield" className="h-4 w-4" />
            Admin dashboard
          </NavLink>
        )}
      </nav>

      <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-700">
          <Icon name="headphones" className="h-3.5 w-3.5 text-brand-600" />
          Need help?
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
          Our support team replies within a few hours, seven days a week.
        </p>
        <NavLink to="/help" className="link mt-2 inline-flex items-center gap-1 text-xs">
          Visit help centre
          <Icon name="arrowRight" className="h-3 w-3" />
        </NavLink>
      </div>
    </aside>
  );
}

export default AccountNav;
