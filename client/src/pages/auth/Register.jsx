import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services';
import { useDebounce } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Alert, Checkbox, Input } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { Progress } from '../../components/ui/Feedback';
import { getPasswordStrength, validateRegister } from '../../utils/validation';

/** Live password strength meter (client-side hint only; server re-validates). */
function PasswordStrength({ password }) {
  if (!password) return null;
  const { score, label } = getPasswordStrength(password);
  const tones = ['danger', 'danger', 'warning', 'brand', 'success'];

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-500">Password strength</span>
        <span className="font-semibold text-ink-700">{label}</span>
      </div>
      <Progress className="mt-1.5" value={score} max={4} tone={tones[score]} />
      <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
        {[
          { ok: password.length >= 8, label: '8+ characters' },
          { ok: /[A-Z]/.test(password), label: 'Uppercase letter' },
          { ok: /[a-z]/.test(password), label: 'Lowercase letter' },
          { ok: /\d/.test(password), label: 'Number' },
        ].map((rule) => (
          <li key={rule.label} className={`flex items-center gap-1.5 ${rule.ok ? 'text-success-600' : 'text-ink-400'}`}>
            <Icon name={rule.ok ? 'check' : 'minus'} className="h-3 w-3" />
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register } = useAuth();
  const toast = useToast();

  const redirect = params.get('redirect') || '/';

  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '', terms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // null | 'checking' | 'available' | 'taken'

  const debouncedEmail = useDebounce(values.email, 500);

  // Live duplicate-email hint (the server is still the authority at submit time)
  useEffect(() => {
    const email = debouncedEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setEmailStatus(null);
      return undefined;
    }
    let cancelled = false;
    setEmailStatus('checking');
    authApi
      .checkEmail(email)
      .then((data) => !cancelled && setEmailStatus(data.available ? 'available' : 'taken'))
      .catch(() => !cancelled && setEmailStatus(null));
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail]);

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
    if (formError) setFormError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateRegister(values);
    if (!values.terms) validation.terms = 'Please accept the terms to continue';
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const data = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      toast.success(`Welcome to Nexus, ${data.user.name.split(' ')[0]}!`);
      navigate(redirect, { replace: true });
    } catch (error) {
      if (error.errors?.length) {
        setErrors(Object.fromEntries(error.errors.map((e) => [e.field, e.message])));
        setFormError(error.message);
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-ink-500">
        Join thousands of shoppers. It takes less than a minute and unlocks 10% off your first order.
      </p>

      {formError && (
        <Alert className="mt-6" variant="error" title="We could not create your account">
          {formError}
        </Alert>
      )}

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          required
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          placeholder="Priya Sharma"
          icon={<Icon name="user" className="h-4 w-4" />}
        />

        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={set('email')}
          error={emailStatus === 'taken' ? 'This email is already registered' : errors.email}
          placeholder="you@example.com"
          icon={<Icon name="mail" className="h-4 w-4" />}
          trailing={
            emailStatus === 'available' ? <Icon name="checkCircle" className="h-4 w-4 text-success-600" /> :
              emailStatus === 'checking' ? <span className="block h-3.5 w-3.5 animate-pulse-soft rounded-full bg-ink-300" /> : null
          }
          hint={emailStatus === 'available' ? 'This email is available' : undefined}
        />

        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={values.password}
            onChange={set('password')}
            error={errors.password}
            placeholder="At least 8 characters"
            icon={<Icon name="lock" className="h-4 w-4" />}
          />
          <PasswordStrength password={values.password} />
        </div>

        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          icon={<Icon name="lock" className="h-4 w-4" />}
        />

        <Checkbox
          checked={values.terms}
          onChange={set('terms')}
          error={errors.terms}
          label="I agree to the terms of service and privacy policy"
        />

        <Button type="submit" size="lg" fullWidth loading={submitting} icon={<Icon name="user" className="h-4 w-4" />}>
          Create account
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
