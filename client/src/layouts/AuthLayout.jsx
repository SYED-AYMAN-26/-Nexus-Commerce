import { Link, Outlet } from 'react-router-dom';
import { Icon, Logo } from '../components/ui/Icon';

const HIGHLIGHTS = [
  { icon: 'truckFast', title: 'Free delivery over ₹1,999', copy: 'Most orders arrive in 2-4 days' },
  { icon: 'rotate', title: '7-day easy returns', copy: 'Print a label and we handle the rest' },
  { icon: 'shield', title: 'Bank-grade security', copy: 'Passwords hashed, payments tokenised' },
];

/** Split-screen shell for login, register and password recovery. */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <Link to="/" className="flex items-center gap-2.5 self-start">
          <Logo className="h-9 w-9" />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">
            Nexus<span className="text-brand-600">Commerce</span>
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        <p className="text-center text-xs text-ink-400">
          Protected by industry standard encryption. By continuing you agree to our{' '}
          <Link to="/help#terms" className="underline hover:text-ink-600">Terms</Link> and{' '}
          <Link to="/help#privacy" className="underline hover:text-ink-600">Privacy Policy</Link>.
        </p>
      </div>

      {/* Marketing column */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.3),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold">
              <Icon name="sparkles" className="h-3.5 w-3.5 text-brand-300" />
              30+ curated products · 8 categories
            </span>
            <h2 className="mt-8 max-w-md text-4xl font-bold leading-tight tracking-tight">
              Everything you love, <span className="text-brand-300">delivered faster</span>.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-300">
              Create an account to track orders, save favourites, manage addresses and check out in seconds.
            </p>
          </div>

          <div className="space-y-4">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-200">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-ink-400">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
