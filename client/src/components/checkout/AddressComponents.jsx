import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input, Select, Checkbox } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { validateAddress } from '../../utils/validation';

const EMPTY_ADDRESS = {
  label: 'Home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
};

const COUNTRIES = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Australia', label: 'Australia' },
];

/** Reusable address form used by checkout and the address book page. */
export function AddressForm({ initialValue, onSubmit, onCancel, submitting = false, submitLabel = 'Save address', showDefaultToggle = true }) {
  const [values, setValues] = useState({ ...EMPTY_ADDRESS, ...initialValue });
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateAddress(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required value={values.fullName} onChange={set('fullName')} error={errors.fullName} placeholder="Priya Sharma" autoComplete="name" />
        <Input
          label="Phone number"
          required
          value={values.phone}
          onChange={set('phone')}
          error={errors.phone}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          icon={<Icon name="phone" className="h-4 w-4" />}
        />
      </div>

      <Input
        label="Address line 1"
        required
        value={values.addressLine1}
        onChange={set('addressLine1')}
        error={errors.addressLine1}
        placeholder="Flat / house number, building, street"
        autoComplete="address-line1"
      />
      <Input
        label="Address line 2"
        value={values.addressLine2}
        onChange={set('addressLine2')}
        placeholder="Area, landmark (optional)"
        autoComplete="address-line2"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="City" required value={values.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
        <Input label="State" required value={values.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" />
        <Input label="Postal code" required value={values.postalCode} onChange={set('postalCode')} error={errors.postalCode} autoComplete="postal-code" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Country" required value={values.country} onChange={set('country')} error={errors.country} options={COUNTRIES} />
        <Select
          label="Save as"
          value={values.label}
          onChange={set('label')}
          options={[
            { value: 'Home', label: 'Home' },
            { value: 'Office', label: 'Office' },
            { value: 'Parents', label: "Parents' place" },
            { value: 'Other', label: 'Other' },
          ]}
        />
      </div>

      {showDefaultToggle && (
        <Checkbox
          label="Set as my default delivery address"
          checked={Boolean(values.isDefault)}
          onChange={set('isDefault')}
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink-100 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting} icon={<Icon name="check" className="h-4 w-4" />}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Selectable address card used in the checkout address step. */
export function AddressCard({ address, selected, onSelect, onEdit, onDelete, onSetDefault, compact = false }) {
  const lines = [
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);

  return (
    <div
      role={onSelect ? 'radio' : undefined}
      aria-checked={onSelect ? selected : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative rounded-2xl border p-4 transition ${onSelect ? 'cursor-pointer' : ''}
                  ${selected ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-500' : 'border-ink-200 bg-white hover:border-ink-300'}`}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition
                        ${selected ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'}`}
          >
            {selected && <Icon name="check" className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">{address.fullName}</p>
            {address.label && <Badge tone="neutral" size="sm">{address.label}</Badge>}
            {address.isDefault && <Badge tone="brand" size="sm">Default</Badge>}
          </div>

          <div className="mt-1.5 space-y-0.5 text-sm text-ink-600">
            {lines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
            <Icon name="phone" className="h-3.5 w-3.5" />
            {address.phone}
          </p>

          {!compact && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onEdit(address); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                >
                  <Icon name="edit" className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
              {onSetDefault && !address.isDefault && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onSetDefault(address); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-600 transition hover:bg-ink-100"
                >
                  <Icon name="check" className="h-3.5 w-3.5" />
                  Set default
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onDelete(address); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-danger-600 transition hover:bg-danger-50"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal wrapper around AddressForm for "add / edit address" flows. */
export function AddressModal({ open, onClose, onSubmit, address, submitting, title }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title={title || (address ? 'Edit address' : 'Add a new address')}>
      <AddressForm
        initialValue={address}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitting={submitting}
        submitLabel={address ? 'Update address' : 'Add address'}
      />
    </Modal>
  );
}

export default AddressForm;
