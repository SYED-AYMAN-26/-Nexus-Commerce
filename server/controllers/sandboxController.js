const Payment = require('../models/Payment');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getProvider } = require('../services/payments');

/**
 * Sandbox "hosted checkout" page.
 *
 * This is the stand-in for the gateway's own hosted page (like Stripe
 * Checkout). It is served by the API, not the SPA, and it posts the outcome
 * back to the server. The client app never tells the server "this payment
 * succeeded" - the server's own payment record is the source of truth.
 */
const checkoutPage = asyncHandler(async (req, res) => {
  const provider = getProvider();
  if (provider.name !== 'mock') throw ApiError.notFound('Sandbox checkout is not available');

  const { reference } = req.params;
  const { token = '' } = req.query;

  const payment = await Payment.findOne({ providerReference: reference });
  if (!payment) throw ApiError.notFound('Payment session not found');

  const tokenOk = (() => {
    try {
      provider.verifySessionToken({ reference: payment.providerReference, amount: payment.amount, currency: payment.currency, token });
      return true;
    } catch {
      return false;
    }
  })();

  const money = (v) => `${payment.currency === 'INR' ? '₹' : ''}${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nexus Pay · Sandbox Checkout</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:grid;place-items:center;padding:24px;background:#0f172a;color:#e2e8f0;
       font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .card{width:100%;max-width:460px;background:#fff;color:#0f172a;border-radius:20px;padding:28px;
        box-shadow:0 24px 60px rgba(2,6,23,.45)}
  .brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:-.02em}
  .dot{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:grid;place-items:center;color:#fff;font-size:14px}
  .amt{font-size:34px;font-weight:800;letter-spacing:-.03em;margin:18px 0 2px}
  .muted{color:#64748b;font-size:13px}
  .row{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid #e2e8f0;font-size:13px}
  .field{margin-top:16px}
  label{display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px}
  input{width:100%;padding:11px 13px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;background:#f8fafc}
  input:focus{outline:2px solid #6366f1;outline-offset:1px;background:#fff}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  button{width:100%;padding:13px;border-radius:12px;border:0;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}
  .pay{margin-top:20px;background:#6366f1;color:#fff}
  .pay:hover{background:#4f46e5}
  .fail{margin-top:10px;background:#fff;color:#b91c1c;border:1px solid #fecaca}
  .fail:hover{background:#fef2f2}
  .cancel{margin-top:10px;background:transparent;color:#64748b;font-weight:600}
  .cancel:hover{color:#0f172a}
  .badge{display:inline-block;margin-top:14px;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  .test{margin-top:14px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:10px;padding:10px 12px;font-size:12px;color:#475569}
  .banner{padding:12px 14px;border-radius:10px;font-size:13px;font-weight:600;margin-bottom:16px}
  .ok{background:#dcfce7;color:#166534}.bad{background:#fee2e2;color:#991b1b}
  code{background:#f1f5f9;padding:1px 5px;border-radius:5px;font-size:12px}
</style></head>
<body><div class="card">
  <div class="brand"><span class="dot">N</span> Nexus Pay <span class="badge">Sandbox</span></div>
  <div class="amt">${money(payment.amount)}</div>
  <div class="muted">Payment reference <code>${esc(payment.providerReference)}</code></div>
  ${tokenOk ? '' : '<div class="banner bad" style="margin-top:16px">This session token is missing or invalid. Re-open checkout from your order page.</div>'}
  <div class="row" style="margin-top:18px"><span>Merchant</span><strong>Nexus Commerce</strong></div>
  <div class="row"><span>Method</span><strong>${esc(payment.method || 'card')}</strong></div>
  <div class="row"><span>Currency</span><strong>${esc(payment.currency)}</strong></div>
  <div class="row"><span>Status</span><strong id="status">${esc(payment.status)}</strong></div>

  <form id="pay-form" style="margin-top:8px">
    <div class="field"><label>Card number</label><input id="card" value="4242 4242 4242 4242" inputmode="numeric" ${tokenOk ? '' : 'disabled'}></div>
    <div class="grid2">
      <div class="field"><label>Expiry</label><input value="12 / 34" ${tokenOk ? '' : 'disabled'}></div>
      <div class="field"><label>CVC</label><input value="123" ${tokenOk ? '' : 'disabled'}></div>
    </div>
    <button class="pay" type="submit" ${tokenOk ? '' : 'disabled'}>Pay ${money(payment.amount)}</button>
    <button class="fail" type="button" id="fail-btn" ${tokenOk ? '' : 'disabled'}>Simulate declined card</button>
    <button class="cancel" type="button" id="cancel-btn">Cancel and return</button>
  </form>

  <div class="test"><strong>Test mode</strong> - no real money moves. Use <code>4242…</code> to succeed and
  <code>4000 0000 0000 0002</code> to force a decline. This page stands in for a real
  gateway's hosted checkout.</div>
</div>
<script>
  const reference = ${JSON.stringify(payment.providerReference)};
  const token = ${JSON.stringify(token)};
  const statusEl = document.getElementById('status');

  async function report(outcome) {
    statusEl.textContent = 'processing…';
    try {
      const res = await fetch('/api/payments/sandbox/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentIntentId: reference, outcome, sessionToken: token })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gateway error');
      statusEl.textContent = json.data.status;
      const url = new URL('/checkout/callback', window.location.origin);
      url.searchParams.set('reference', reference);
      url.searchParams.set('status', outcome === 'success' ? 'success' : outcome);
      // Hand control back to the storefront (opened in the same tab by the app)
      window.location.href = ${JSON.stringify(config.clientUrl)} + '/checkout/callback?reference=' + encodeURIComponent(reference) + '&status=' + (outcome === 'success' ? 'success' : outcome);
    } catch (err) {
      statusEl.textContent = 'error';
      alert(err.message);
    }
  }

  document.getElementById('pay-form').addEventListener('submit', (e) => { e.preventDefault(); report('success'); });
  document.getElementById('fail-btn').addEventListener('click', () => report('failure'));
  document.getElementById('cancel-btn').addEventListener('click', () => report('cancel'));
</script>
</body></html>`);
});

module.exports = { checkoutPage };
