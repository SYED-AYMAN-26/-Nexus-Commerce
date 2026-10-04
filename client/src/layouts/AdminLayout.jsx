import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV } from '../utils/constants';
import { initials } from '../utils/format';

/** Sidebar navigation shared by desktop rail and mobile drawer. */
function NavItems({ onNavigate }) {
  return (
    <nav className="space-y-1" aria-label="Admin sections">
      {ADMIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`}
        >
          <Icon name={item.icon} className="h-4.5 w-4.5 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Dark dashboard shell: fixed sidebar, sticky top bar, content outlet. */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-ink-100 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-950 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-2.5 border-b border-white/5 px-5 py-5">
          <Logo className="h-8 w-8" />
          <div className="leading-tight">
            <p className="font-display text-sm font-extrabold tracking-tight text-white">Nexus</p>
            <p className="text-2xs uppercase tracking-wider text-ink-500">Admin console</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-3 py-4">
          <NavItems />
        </div>

        <div className="border-t border-white/5 p-3">
          <Link to="/" className="admin-nav-link" target="_blank" rel="noreferrer">
            <Icon name="externalLink" className="h-4.5 w-4.5" />
            View storefront
          </Link>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials(user?.name || 'A')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
              <p className="truncate text-2xs text-ink-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-danger-400"
            >
              <Icon name="logOut" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open admin menu"
            className="-ml-1 rounded-xl p-2.5 text-ink-700 transition hover:bg-ink-100 lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5 lg:hidden">
            <Logo className="h-7 w-7" />
            <span className="text-sm font-bold text-ink-900">Admin</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge tone="brand" size="sm" className="hidden sm:inline-flex">Live data</Badge>
            <Link
              to="/"
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
            >
              Storefront
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" title="Admin" width="max-w-[17rem]" className="bg-ink-950">
        <div className="h-full bg-ink-950 px-3 py-4">
          <NavItems onNavigate={() => setMenuOpen(false)} />
          <div className="mt-4 border-t border-white/5 pt-4">
            <button type="button" onClick={handleLogout} className="admin-nav-link w-full text-danger-400 hover:text-danger-300">
              <Icon name="logOut" className="h-4.5 w-4.5" />
              Sign out
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default AdminLayout;
