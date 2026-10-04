import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Alert, Checkbox, Input } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { validateLogin } from '../../utils/validation';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();

  const redirect = params.get('redirect') || '/';
  const justRegistered = params.get('registered') === '1';
  const justReset = params.get('reset') === '1';

  const [values, setValues] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
    if (formError) setFormError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateLogin(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const data = await login({ email: values.email.trim(), password: values.password });
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      navigate(redirect, { replace: true });
    } catch (error) {
      if (error.errors?.length) setErrors(Object.fromEntries(error.errors.map((e) => [e.field, e.message])));
      else setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (role) => {
    const credentials = role === 'admin'
      ? { email: 'admin@nexus.dev', password: 'Admin@12345' }
      : { email: 'customer@nexus.dev', password: 'Customer@123' };
    setValues((current) => ({ ...current, ...credentials }));
    toast.info(`Demo ${role} credentials filled — press Sign in`);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-500">
        Sign in to track orders, manage your wishlist and check out faster.
      </p>

      {justRegistered && (
        <Alert className="mt-6" variant="success" title="Account created">
          Your account is ready. Sign in below to continue.
        </Alert>
      )}
      {justReset && (
        <Alert className="mt-6" variant="success" title="Password updated">
          Sign in with your new password.
        </Alert>
      )}
      {formError && (
        <Alert className="mt-6" variant="error" title="We could not sign you in">
          {formError}
        </Alert>
      )}

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          placeholder="you@example.com"
          icon={<Icon name="mail" className="h-4 w-4" />}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          placeholder="••••••••"
          icon={<Icon name="lock" className="h-4 w-4" />}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label="Keep me signed in" checked={values.remember} onChange={set('remember')} />
          <Link to="/forgot-password" className="link text-sm">Forgot password?</Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} icon={<Icon name="logIn" className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-dashed border-ink-300 bg-ink-50/60 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          Demo accounts (seeded)
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => fillDemo('customer')}>Customer</Button>
          <Button size="sm" variant="outline" onClick={() => fillDemo('admin')}>Administrator</Button>
        </div>
      </div>

      <p className="mt-7 text-center text-sm text-ink-500">
        New to Nexus?{' '}
        <Link to={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="link">
          Create an account
        </Link>
      </p>
    </div>
  );
}
