import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Alert } from '../components/ui/Form';
import { useCopyToClipboard } from '../hooks';
import { useToast } from '../context/ToastContext';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@nexusstore.dev';
const isDev = import.meta.env.DEV;

/**
 * Error page.
 *
 * Rendered two ways: as the `/error` route (with details passed through router
 * state) and by the top-level ErrorBoundary, which passes the thrown error in.
 * Technical detail is only exposed during development.
 */
export default function ErrorPage({ error: boundaryError }) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { copy } = useCopyToClipboard();
  const [showDetail, setShowDetail] = useState(false);

  const state = location.state || {};
  const error = boundaryError || state.error;

  const status = Number(state.status || error?.status) || 500;
  const message =
    state.message ||
    (typeof error === 'string' ? error : error?.message) ||
    'Something went wrong while loading this page. Please retry — if it keeps happening, contact support with the reference below.';

  const reference = `ERR-${String(status).padStart(3, '0')}-${Date.now().toString(36).toUpperCase()}`;
  const detail = error?.stack || state.detail || (error ? safeStringify(error) : null);

  const copyReference = () => {
    copy(reference);
    toast.success('Reference copied — quote it to support for faster help.');
  };

  return (
    <div className="container-page flex min-h-[75vh] items-center justify-center py-14">
      <div className="w-full max-w-2xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-danger-50 text-danger-600">
          <Icon name="alertTriangle" className="h-8 w-8" />
        </span>

        <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">
          HTTP {status}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {status === 404 ? 'We cannot find that page' : status === 500 ? 'Something broke on our side' : 'We could not complete that request'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-600">{message}</p>

        <button
          type="button"
          onClick={copyReference}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2 font-mono text-xs text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
          title="Copy reference"
        >
          <Icon name="copy" className="h-3.5 w-3.5" />
          Reference {reference}
        </button>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()} icon={<Icon name="refresh" className="h-4 w-4" />}>
            Try again
          </Button>
          <Button to="/" variant="outline" icon={<Icon name="home" className="h-4 w-4" />}>
            Back to home
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)} icon={<Icon name="arrowLeft" className="h-4 w-4" />}>
            Previous page
          </Button>
        </div>

        <div className="mt-10 text-left">
          <Alert variant="info" title="Still stuck?">
            Email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            with the reference above. Most issues clear up on a retry — the request may have failed because the network
            dropped mid-flight.
          </Alert>
        </div>

        {isDev && detail && (
          <div className="mt-6 text-left">
            <button
              type="button"
              onClick={() => setShowDetail((current) => !current)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500 hover:text-ink-800"
            >
              <Icon name="chevronRight" className={`h-3.5 w-3.5 transition-transform ${showDetail ? 'rotate-90' : ''}`} />
              {showDetail ? 'Hide' : 'Show'} technical detail (development only)
            </button>
            {showDetail && (
              <pre className="scroll-thin mt-3 max-h-72 overflow-auto rounded-xl bg-ink-900 p-4 text-left text-xs leading-relaxed text-ink-50">
                {String(detail)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
