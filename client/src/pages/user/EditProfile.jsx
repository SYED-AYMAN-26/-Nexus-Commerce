import { useState } from 'react';
import { api } from '../../services';
import { Breadcrumbs } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Alert, Input } from '../../components/ui/Form';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Progress } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getPasswordStrength } from '../../utils/validation';
import { formatDate } from '../../utils/format';

/** Account information form. */
function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: null }));
  };

  const dirty = values.name !== (user?.name || '') || values.email !== (user?.email || '') || values.phone !== (user?.phone || '');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await updateProfile(values);
      toast.success('Profile updated');
    } catch (error) {
      if (error.errors?.length) setErrors(Object.fromEntries(error.errors.map((e) => [e.field, e.message])));
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold text-ink-900">Account information</h2>
      <p className="mt-1 text-sm text-ink-500">Keep your details up to date so deliveries always reach you.</p>

      <div className="mt-6 space-y-5">
        <Input
          label="Full name"
          required
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          icon={<Icon name="user" className="h-4 w-4" />}
        />
        <Input
          label="Email address"
          type="email"
          required
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          icon={<Icon name="mail" className="h-4 w-4" />}
          hint="Changing your email changes where order updates are sent."
        />
        <Input
          label="Phone number"
          value={values.phone}
          onChange={set('phone')}
          error={errors.phone}
          placeholder="+91 98765 43210"
          icon={<Icon name="phone" className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
        <p className="text-xs text-ink-500">
          Account created {formatDate(user?.createdAt)} · {user?.addresses?.length || 0} saved address(es)
        </p>
        <Button type="submit" loading={saving} disabled={!dirty} icon={<Icon name="check" className="h-4 w-4" />}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

/** Password change with strength guidance. */
function PasswordForm() {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const strength = getPasswordStrength(values.newPassword);
  const toneMap = ['danger', 'danger', 'warning', 'brand', 'success'];

  const set = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: null }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = {};
    if (!values.currentPassword) validation.currentPassword = 'Enter your current password';
    if (strength.score < 4) validation.newPassword = 'Use 8+ characters with upper, lower case and a number';
    if (values.newPassword !== values.confirmPassword) validation.confirmPassword = 'Passwords do not match';
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    try {
      await changePassword(values);
      toast.success('Password updated. Other devices have been signed out.');
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      if (error.errors?.length) setErrors(Object.fromEntries(error.errors.map((e) => [e.field, e.message])));
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold text-ink-900">Change password</h2>
      <p className="mt-1 text-sm text-ink-500">
        For your security, changing your password signs out every other device.
      </p>

      <div className="mt-6 space-y-5">
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={values.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          icon={<Icon name="lock" className="h-4 w-4" />}
        />

        <div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={values.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            icon={<Icon name="key" className="h-4 w-4" />}
          />
          {values.newPassword && (
            <>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-ink-500">Strength</span>
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
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          icon={<Icon name="lock" className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 border-t border-ink-100 pt-5 text-right">
        <Button type="submit" loading={saving} icon={<Icon name="shield" className="h-4 w-4" />}>
          Update password
        </Button>
      </div>
    </form>
  );
}

/** Danger zone: delete account (guarded by password + active orders). */
function DangerZone() {
  const { logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete('/users/account', { data: { password } });
      toast.success('Your account has been deleted');
      await logout();
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-danger-200 bg-danger-50/50 p-5 sm:p-6">
      <h2 className="text-base font-bold text-danger-700">Danger zone</h2>
      <p className="mt-1 text-sm text-danger-600/90">
        Deleting your account removes your profile, addresses and wishlist permanently. Order records are retained for
        accounting purposes.
      </p>

      <Button variant="danger" className="mt-5" onClick={() => setOpen(true)} icon={<Icon name="trash" className="h-4 w-4" />}>
        Delete my account
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => { setOpen(false); setError(null); }}
        onConfirm={remove}
        loading={busy}
        title="Delete your account?"
        confirmLabel="Delete permanently"
        cancelLabel="Keep my account"
      >
        <div className="space-y-4">
          <Alert variant="warning" title="This cannot be undone">
            Orders in progress must complete before an account can be deleted.
          </Alert>
          <Input
            label="Confirm your password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error}
            placeholder="Enter your password"
          />
        </div>
      </ConfirmDialog>
    </section>
  );
}

export default function EditProfile() {
  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account', to: '/account' }, { label: 'Profile settings' }]} />

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Profile settings</h1>
      <p className="mt-1.5 text-sm text-ink-500">Update your personal information and keep your account secure.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />
        <div className="min-w-0 space-y-6">
          <ProfileForm />
          <PasswordForm />
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
