import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services';
import { Button } from '../../components/ui/Button';
import { Alert, Input } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { isEmail } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';
import { useCopyToClipboard } from '../../hooks';

/**
 * Password reset request.
 * The API always responds 200 so the endpoint cannot be used to discover which
 * email addresses have accounts. In development it also returns the reset link
 * so the flow can be completed without an SMTP server.
 */
export default function ForgotPassword() {
  const toast = useToast();
  const { copied, copy } = useCopyToClipboard();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [devLink, setDevLink] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!isEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError(null);
    setStatus('sending');
    try {
      const data = await authApi.forgotPassword(email.trim());
      setStatus('sent');
      setDevLink(data?.devResetUrl || null);
      toast.success('Reset link sent');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="animate-fade-in">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-success-100 text-success-700">
          <Icon name="mail" className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          If an account exists for <span className="font-medium text-ink-800">{email}</span>, we have sent a password
          reset link. The link expires in 15 minutes.
        </p>

        {devLink && (
          <Alert className="mt-6" variant="info" title="Development mode">
            <p className="mb-2 text-xs">
              No mail provider is configured, so the reset link is shown here instead of being emailed.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => { copy(devLink); toast.success('Link copied'); }}>
                <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button size="sm" to={devLink.replace(window.location.origin, '')}>Open reset page</Button>
            </div>
          </Alert>
        )}

        <div className="mt-7 space-y-3">
          <Button variant="outline" fullWidth onClick={() => setStatus('idle')} icon={<Icon name="refresh" className="h-4 w-4" />}>
            Try a different email
          </Button>
          <Button variant="ghost" fullWidth to="/login">Back to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Reset your password</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Enter the email address linked to your account and we will send you a secure link to choose a new password.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => { setEmail(event.target.value); setError(null); }}
          error={error}
          placeholder="you@example.com"
          icon={<Icon name="mail" className="h-4 w-4" />}
        />

        <Button type="submit" size="lg" fullWidth loading={status === 'sending'} icon={<Icon name="send" className="h-4 w-4" />}>
          Send reset link
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-500">
        Remembered it? <Link to="/login" className="link">Back to sign in</Link>
      </p>
    </div>
  );
}
