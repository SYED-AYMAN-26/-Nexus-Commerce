import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV } from '../utils/constants';

const SUGGESTIONS = [
  { to: '/products', label: 'All products', icon: 'bag' },
  { to: '/categories', label: 'Browse categories', icon: 'grid' },
  { to: '/account/orders', label: 'My orders', icon: 'orders' },
  { to: '/help', label: 'Help & support', icon: 'headphones' },
];

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-3xl">
        <div className="text-center">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Error 404</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            We cannot find that page
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-600">
            The link may be broken, or the product might have sold out and been removed from the catalogue.
          </p>

          <p className="mx-auto mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2 font-mono text-xs text-ink-600">
            <Icon name="alertCircle" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            <span className="truncate">{location.pathname}{location.search}</span>
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => navigate(-1)} variant="outline" icon={<Icon name="arrowLeft" className="h-4 w-4" />}>
              Go back
            </Button>
            <Button to="/" icon={<Icon name="home" className="h-4 w-4" />}>
              Back to home
            </Button>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-ink-200 bg-white p-6">
          <p className="text-sm font-semibold text-ink-900">Try one of these instead</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SUGGESTIONS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-700 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-ink-800">{item.label}</span>
                <Icon name="chevronRight" className="ml-auto h-4 w-4 text-ink-300 transition group-hover:text-brand-500" />
              </Link>
            ))}
          </div>

          {user && isAdmin && (
            <p className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500">
              Signed in as an administrator — jump to the{' '}
              <Link to={ADMIN_NAV[0].to} className="link font-semibold">
                admin dashboard
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
