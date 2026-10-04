import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services';
import { Button } from '../../components/ui/Button';
import { Alert, Input } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { Progress } from '../../components/ui/Feedback';
import { getPasswordStrength } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => getPasswordStrength(values.password), [values.password]);
  const toneMap = ['danger', 'danger', 'warning', 'brand', 'success'];

  if (!token) {
    return (
      <div className="animate-fade-in text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-50 text-danger-600">
          <Icon name="alert-triangle" className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900">Reset link missing</h1>
        <p className="mt-2 text-sm text-ink-500">
          This page needs a valid reset token. Request a new link and try again.
        </p>
        <Button className="mt-6" to="/forgot-password" fullWidth>Request a new link</Button>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const validation = {};
    if (strength.score < 4) validation.password = 'Use 8+ characters with upper, lower case and a number';
    if (values.confirmPassword !== values.password) validation.confirmPassword = 'Passwords do not match';
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await authApi.resetPassword({ token, password: values.password, confirmPassword: values.confirmPassword, email });
      toast.success('Password updated — please sign in');
      navigate('/login?reset=1', { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Choose a new password</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        {email ? <>Setting a new password for <span className="font-medium text-ink-800">{email}</span>.</> : 'Pick something strong that you have not used before.'}
      </p>

      {formError && (
        <Alert
          className="mt-6"
          variant="error"
          title="We could not reset your password"
          actions={<Button size="sm" variant="outline" to="/forgot-password">Request a new link</Button>}
        >
          {formError}
        </Alert>
      )}

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={values.password}
            onChange={(event) => { setValues((v) => ({ ...v, password: event.target.value })); setErrors((e) => ({ ...e, password: null })); }}
            error={errors.password}
            placeholder="At least 8 characters"
            icon={<Icon name="lock" className="h-4 w-4" />}
          />
          {values.password && (
            <>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-ink-500">Password strength</span>
                <span className="font-semibold text-ink-700">{strength.label}</span>
              </div>
              <Progress className="mt-1.5" value={strength.score} max={4} tone={toneMap[strength.score]} />
            </>
          )}
        </div>

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={(event) => { setValues((v) => ({ ...v, confirmPassword: event.target.value })); setErrors((e) => ({ ...e, confirmPassword: null })); }}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          icon={<Icon name="lock" className="h-4 w-4" />}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting} icon={<Icon name="key" className="h-4 w-4" />}>
          Update password
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-500">
        <Link to="/login" className="link">Back to sign in</Link>
      </p>
    </div>
  );
}
