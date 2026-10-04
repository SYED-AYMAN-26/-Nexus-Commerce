import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/ui/Misc';
import { Icon } from '../components/ui/Icon';
import { Input, Textarea, Alert } from '../components/ui/Form';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TOPICS = [
  {
    icon: 'orders',
    title: 'Orders & tracking',
    description: 'Track a parcel, change an address before dispatch, or cancel an order.',
    items: [
      ['Where is my order?', 'Open My orders → select the order → the progress tracker shows every status change with timestamps.'],
      ['Can I cancel after placing an order?', 'Yes, while the order is pending, confirmed or processing. Cancelling releases the reserved stock and refunds any captured payment to the original method.'],
      ['How do I get an invoice?', 'Every order detail page has a Download invoice button that generates a GST invoice PDF.'],
    ],
  },
  {
    icon: 'refresh',
    title: 'Returns & refunds',
    description: 'Seven day returns on unused items in original packaging.',
    items: [
      ['Return window', 'Raise a return within 7 days of delivery from the order detail page.'],
      ['Refund timeline', 'Refunds are issued within 5-7 working days after the item is received and inspected.'],
      ['Damaged in transit?', 'Share photographs with support within 48 hours of delivery for a free replacement.'],
    ],
  },
  {
    icon: 'creditCard',
    title: 'Payments & security',
    description: 'Cards, UPI and net banking processed by our payment gateway.',
    items: [
      ['Is my payment safe?', 'Card data never touches our servers. We only store the gateway reference, masked last-four digits and the payment status.'],
      ['Payment failed but money left my account', 'Failed authorisations are auto-released by the bank within 3-5 working days. No order is created until the gateway confirms a capture.'],
      ['Coupons', 'One coupon per order. Discounts apply to the item subtotal before shipping and GST.'],
    ],
  },
  {
    icon: 'truckFast',
    title: 'Shipping',
    description: 'Pan-India delivery in 2-6 working days; free over ₹1,999.',
    items: [
      ['Charges', 'Flat ₹99 below ₹1,999. Free shipping on orders of ₹1,999 and above.'],
      ['Delivery estimate', 'Metro cities 2-3 days, rest of India 4-6 working days from dispatch.'],
      ['Cash on delivery', 'Available in selected pin codes; choose "Cash on delivery" at the payment step.'],
    ],
  },
];

export default function Help() {
  const toast = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState('Where is my order?');
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
  };

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Please tell us your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.subject.trim().length < 3) next.subject = 'Add a short subject';
    if (form.message.trim().length < 10) next.message = 'Please describe the issue in at least 10 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    // Support requests are handed to the support desk; nothing is stored client-side.
    setSent(true);
    toast.success('Message ready to send — our support desk replies within one business day.');
  };

  return (
    <div className="container-page py-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Help & support' }]} />

      <header className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">Help & support</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          Answers to the questions we get most, plus a direct line to the Nexus support desk. We reply within one
          business day, Monday to Saturday, 9am to 7pm IST.
        </p>
      </header>

      {/* Quick channels */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: 'mail', title: 'Email', value: 'support@nexusstore.dev', hint: 'Replies within 24 hours', href: 'mailto:support@nexusstore.dev' },
          { icon: 'phone', title: 'Phone', value: '+91 1800 123 4567', hint: 'Mon-Sat, 9am-7pm IST', href: 'tel:+911800123456' },
          { icon: 'headphones', title: 'Live chat', value: 'Start a chat', hint: 'Average wait under 2 minutes', href: '#contact' },
        ].map((channel) => (
          <a
            key={channel.title}
            href={channel.href}
            className="group flex items-start gap-3.5 rounded-2xl border border-ink-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
              <Icon name={channel.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">{channel.title}</p>
              <p className="text-sm text-brand-600">{channel.value}</p>
              <p className="mt-0.5 text-xs text-ink-500">{channel.hint}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-ink-900">Frequently asked questions</h2>
          <p className="mt-1 text-sm text-ink-500">Browse by topic — tap a question to expand it.</p>

          <div className="mt-5 space-y-6">
            {TOPICS.map((topic) => (
              <div key={topic.title} className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700">
                    <Icon name={topic.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900">{topic.title}</h3>
                    <p className="text-sm text-ink-500">{topic.description}</p>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
                  {topic.items.map(([question, answer]) => (
                    <div key={question}>
                      <button
                        type="button"
                        onClick={() => setOpen(open === question ? null : question)}
                        aria-expanded={open === question}
                        className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
                      >
                        <span className={`text-sm font-medium ${open === question ? 'text-brand-700' : 'text-ink-800'}`}>
                          {question}
                        </span>
                        <Icon
                          name="chevronDown"
                          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open === question ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {open === question && (
                        <p className="animate-fade-in pb-4 text-sm leading-relaxed text-ink-600">{answer}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <aside id="contact" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-900">Still need help?</h2>
            <p className="mt-1 text-sm text-ink-500">
              Send us the details and we will pick it up from there.
            </p>

            {sent ? (
              <div className="mt-5">
                <Alert variant="success" title="Request received">
                  Ticket <span className="font-mono font-semibold">NX-{Date.now().toString().slice(-6)}</span> was
                  created for {form.email}. Keep an eye on your inbox — replies go to the same address.
                </Alert>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => { setSent(false); setForm((c) => ({ ...c, subject: '', message: '' })); }}>
                    Send another message
                  </Button>
                  <Button to="/account/orders" variant="ghost">My orders</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
                <Input
                  label="Your name"
                  required
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  placeholder="Priya Sharma"
                  autoComplete="name"
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <Input
                  label="Subject"
                  required
                  value={form.subject}
                  onChange={set('subject')}
                  error={errors.subject}
                  placeholder="Refund not received for NX-2024-0042"
                />
                <Textarea
                  label="How can we help?"
                  required
                  rows={5}
                  maxLength={1000}
                  value={form.message}
                  onChange={set('message')}
                  error={errors.message}
                  placeholder="Include your order number so we can look it up faster."
                />
                <Button type="submit" fullWidth icon={<Icon name="send" className="h-4 w-4" />}>
                  Send message
                </Button>
                <p className="text-center text-xs text-ink-500">
                  Prefer browsing? <Link to="/products" className="link font-semibold">Shop all products</Link>
                </p>
              </form>
            )}
          </div>

          <div className="mt-4 flex items-start gap-3.5 rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ink-700">
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Delivery estimates</p>
              <p className="mt-0.5 text-sm text-ink-600">
                Metro cities 2-3 days · Rest of India 4-6 working days from dispatch.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
