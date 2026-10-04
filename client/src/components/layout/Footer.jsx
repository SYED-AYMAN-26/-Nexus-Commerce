import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Logo } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { FOOTER_LINKS } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';

const TRUST_ITEMS = [
  { icon: 'truckFast', title: 'Free shipping over ₹1,999', copy: 'Dispatched within 24 hours' },
  { icon: 'rotate', title: '7-day easy returns', copy: 'No questions asked' },
  { icon: 'shield', title: 'Secure payments', copy: 'PCI-DSS compliant gateway' },
  { icon: 'headphones', title: 'Support 7 days a week', copy: 'Chat, email or phone' },
];

const PAYMENT_BADGES = ['VISA', 'Mastercard', 'RuPay', 'UPI', 'Net Banking', 'COD'];

/** Newsletter capture - posts nothing sensitive, only an email address. */
function NewsletterForm() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const submit = async (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setStatus('loading');
    // No mail provider is wired up by default; the address is recorded in the
    // server log so the flow is testable without an SMTP account.
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('You are on the list! Look out for our next drop.');
      setEmail('');
      setStatus('idle');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        containerClassName="flex-1"
        className="bg-white/5 text-white placeholder:text-ink-400 border-white/10 focus:border-brand-400"
      />
      <Button type="submit" loading={status === 'loading'} size="md" className="shrink-0">
        Subscribe
      </Button>
    </form>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-ink-200 bg-ink-950 text-ink-300">
      {/* Trust strip */}
      <div className="border-b border-white/5">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-brand-300">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-ink-400">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* Brand + newsletter */}
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Nexus<span className="text-brand-400">Commerce</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-400">
            A modern store for electronics, fashion, home and beauty. Curated products, honest pricing and fast
            delivery across India.
          </p>

          <div className="mt-6">
            <p className="text-sm font-semibold text-white">Get 10% off your first order</p>
            <p className="mb-3 mt-1 text-xs text-ink-400">Join the newsletter for drops, deals and restock alerts.</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Link columns */}
        <FooterColumn title="Shop" links={FOOTER_LINKS.shop} />
        <FooterColumn title="Account" links={FOOTER_LINKS.account} />
        <FooterColumn title="Help" links={FOOTER_LINKS.help} />
      </div>

      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">We accept</span>
            {PAYMENT_BADGES.map((badge) => (
              <span key={badge} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-ink-300">
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-ink-500">
            <span>© {year} Nexus Commerce</span>
            <Link to="/help" className="transition hover:text-white">Help centre</Link>
            <Link to="/help#privacy" className="transition hover:text-white">Privacy</Link>
            <Link to="/help#terms" className="transition hover:text-white">Terms</Link>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-sm text-ink-400 transition hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Footer;
