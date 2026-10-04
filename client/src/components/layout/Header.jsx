import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchBar } from './SearchBar';
import { Drawer } from '../ui/Drawer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { productApi } from '../../services';
import { useClickOutside, useScrollPosition } from '../../hooks';
import { initials } from '../../utils/format';

/** Announcement strip with the current offer. */
function AnnouncementBar() {
  return (
    <div className="bg-ink-900 text-white">
      <div className="container-page flex h-9 items-center justify-center gap-2 overflow-hidden text-xs sm:text-sm">
        <Icon name="sparkles" className="h-3.5 w-3.5 shrink-0 text-brand-300" />
        <p className="truncate">
          Free shipping on orders over ₹1,999 · Use code{' '}
          <span className="font-semibold text-brand-200">WELCOME10</span> for 10% off your first order
        </p>
      </div>
    </div>
  );
}

/** Primary nav built from live categories. */
function useNavLinks() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;
    productApi
      .categories()
      .then((data) => active && setCategories(data.categories || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return [
    { label: 'Home', to: '/' },
    { label: 'Shop all', to: '/products' },
    { label: 'New arrivals', to: '/products?sort=newest' },
    { label: 'Deals', to: '/products?deals=true' },
    ...(categories.length
      ? [{ label: 'Categories', to: '/categories', children: categories.map((c) => ({ label: c.name, to: `/category/${c.slug}`, count: c.productCount })) }]
      : []),
  ];
}

/** Dropdown listing every category (desktop "Categories" nav item). */
function CategoryMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false), { enabled: open });

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`nav-link ${open ? 'nav-link-active' : ''}`}
      >
        Categories
        <Icon name="chevronDown" className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-[26rem] animate-fade-in-up pt-2">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-ink-200 bg-white p-2.5 shadow-popover">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 text-2xs text-ink-400">{item.count}</span>
              </Link>
            ))}
            <Link
              to="/categories"
              onClick={() => setOpen(false)}
              className="col-span-2 mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-ink-50 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Browse all categories
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Account dropdown: profile, orders, wishlist, addresses, admin link, logout. */
function AccountMenu() {
  const { user, isAuthenticated, isAdmin, logout, wishlistCount } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useClickOutside(() => setOpen(false), { enabled: open });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" to="/login" className="hidden sm:inline-flex">
          Sign in
        </Button>
        <Button size="sm" to="/register">
          Sign up
        </Button>
      </div>
    );
  }

  const links = [
    { label: 'My profile', to: '/account', icon: 'user' },
    { label: 'My orders', to: '/account/orders', icon: 'orders' },
    { label: `Wishlist${wishlistCount ? ` (${wishlistCount})` : ''}`, to: '/account/wishlist', icon: 'heart' },
    { label: 'Addresses', to: '/account/addresses', icon: 'mapPin' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-ink-300 hover:shadow-sm"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink-700 sm:block">
          {user.name.split(' ')[0]}
        </span>
        <Icon name="chevronDown" className="h-3.5 w-3.5 text-ink-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 animate-fade-in-up overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-popover"
        >
          <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            {isAdmin && <Badge tone="brand" size="sm" className="mt-2">Administrator</Badge>}
          </div>

          <div className="p-1.5">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition hover:bg-ink-50"
              >
                <Icon name={link.icon} className="h-4 w-4 text-ink-400" />
                {link.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                <Icon name="dashboard" className="h-4 w-4" />
                Admin dashboard
              </Link>
            )}
          </div>

          <div className="border-t border-ink-100 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate('/');
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger-600 transition hover:bg-danger-50"
            >
              <Icon name="logOut" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Slide-out menu for small screens. */
function MobileMenu({ open, onClose, navLinks }) {
  const { isAuthenticated, isAdmin, user, logout, wishlistCount } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/');
  };

  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu" width="max-w-xs">
      <div className="flex h-full flex-col">
        <div className="border-b border-ink-100 p-4">
          <SearchBar variant="mobile" onNavigate={onClose} />
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scroll-thin p-3">
          <p className="px-3 py-2 text-2xs font-bold uppercase tracking-wider text-ink-400">Shop</p>
          {navLinks.map((link) => (
            <div key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                onClick={onClose}
                className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition
                                              ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'}`}
              >
                {link.label}
                <Icon name="chevronRight" className="h-4 w-4 text-ink-300" />
              </NavLink>
              {link.children && (
                <div className="ml-3 border-l border-ink-100 pl-2">
                  {link.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      onClick={onClose}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-600 transition hover:bg-ink-50"
                    >
                      {child.label}
                      <span className="text-2xs text-ink-400">{child.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isAuthenticated ? (
            <>
              <p className="mt-4 px-3 py-2 text-2xs font-bold uppercase tracking-wider text-ink-400">My account</p>
              {[
                { label: 'Profile', to: '/account', icon: 'user' },
                { label: 'My orders', to: '/account/orders', icon: 'orders' },
                { label: `Wishlist${wishlistCount ? ` (${wishlistCount})` : ''}`, to: '/account/wishlist', icon: 'heart' },
                { label: 'Addresses', to: '/account/addresses', icon: 'mapPin' },
                ...(isAdmin ? [{ label: 'Admin dashboard', to: '/admin', icon: 'dashboard' }] : []),
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  <Icon name={link.icon} className="h-4 w-4 text-ink-400" />
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger-600 transition hover:bg-danger-50"
              >
                <Icon name="logOut" className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <div className="mt-5 space-y-2.5 px-1">
              <Button to="/login" variant="outline" fullWidth onClick={onClose}>
                Sign in
              </Button>
              <Button to="/register" fullWidth onClick={onClose}>
                Create account
              </Button>
            </div>
          )}
        </nav>

        <div className="border-t border-ink-100 p-4 text-xs text-ink-500">
          <p className="flex items-center gap-2">
            <Icon name="shield" className="h-4 w-4 text-success-600" />
            Secure payments · Easy returns
          </p>
        </div>
      </div>
    </Drawer>
  );
}

/**
 * Sticky site header.
 * Desktop: logo, nav, search, wishlist, cart, account.
 * Mobile: hamburger, logo, search icon, cart.
 */
export function Header() {
  const navLinks = useNavLinks();
  const { itemCount, openDrawer } = useCart();
  const { isAuthenticated, wishlistCount } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const scrolled = useScrollPosition(10);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  return (
    <>
      <AnnouncementBar />

      <header
        className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-all duration-300
                    ${scrolled ? 'border-ink-200 shadow-sm' : 'border-transparent'}`}
      >
        <div className="container-page">
          <div className={`flex items-center gap-3 transition-all duration-300 ${scrolled ? 'h-16' : 'h-[4.5rem]'}`}>
            {/* Mobile: menu */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="-ml-1 rounded-xl p-2.5 text-ink-700 transition hover:bg-ink-100 lg:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Nexus Commerce home">
              <Logo className="h-9 w-9" />
              <span className="hidden font-display text-lg font-extrabold tracking-tight text-ink-900 sm:block">
                Nexus<span className="text-brand-600">Commerce</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main navigation">
              {navLinks.map((link) =>
                link.children ? (
                  <CategoryMenu key={link.label} items={link.children} />
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                  >
                    {link.label}
                  </NavLink>
                ),
              )}
            </nav>

            {/* Desktop search */}
            <div className="ml-auto hidden max-w-xl flex-1 lg:block">
              <SearchBar variant="desktop" />
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-1 lg:ml-3 lg:gap-1.5">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((value) => !value)}
                aria-label="Search"
                className="rounded-xl p-2.5 text-ink-700 transition hover:bg-ink-100 lg:hidden"
              >
                <Icon name="search" className="h-5 w-5" />
              </button>

              <Link
                to={isAuthenticated ? '/account/wishlist' : '/login?redirect=/account/wishlist'}
                aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`}
                className="relative hidden rounded-xl p-2.5 text-ink-700 transition hover:bg-ink-100 sm:block"
              >
                <Icon name="heart" className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={openDrawer}
                aria-label={`Shopping cart${itemCount ? `, ${itemCount} items` : ''}`}
                className="relative rounded-xl p-2.5 text-ink-700 transition hover:bg-ink-100"
              >
                <Icon name="cart" className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute right-0.5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              <div className="ml-1 hidden lg:block">
                <AccountMenu />
              </div>

              <div className="lg:hidden">
                <Link
                  to={isAuthenticated ? '/account' : '/login'}
                  aria-label={isAuthenticated ? 'My account' : 'Sign in'}
                  className="block rounded-xl p-2.5 text-ink-700 transition hover:bg-ink-100"
                >
                  <Icon name="user" className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile search row */}
          {mobileSearchOpen && (
            <div className="animate-fade-in pb-3 lg:hidden">
              <SearchBar variant="mobile" autoFocus onNavigate={() => setMobileSearchOpen(false)} />
            </div>
          )}
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} />
    </>
  );
}

export default Header;
