import { useCallback, useEffect, useState } from 'react';
import { addressApi } from '../../services';
import { Breadcrumbs } from '../../components/ui/Misc';
import { AccountNav } from '../../components/common/AccountNav';
import { AddressCard, AddressModal } from '../../components/checkout/AddressComponents';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Form';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { useToast } from '../../context/ToastContext';

const MAX_ADDRESSES = 5;

export default function Addresses() {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await addressApi.list();
      setAddresses(data.addresses || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (address) => {
    setEditing(address);
    setModalOpen(true);
  };

  const save = async (payload) => {
    setSubmitting(true);
    try {
      const data = editing ? await addressApi.update(editing._id, payload) : await addressApi.create(payload);
      setAddresses(data.addresses || []);
      setModalOpen(false);
      toast.success(editing ? 'Address updated' : 'Address added');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const makeDefault = async (address) => {
    setBusyId(address._id);
    try {
      const data = await addressApi.setDefault(address._id);
      setAddresses(data.addresses || []);
      toast.success('Default shipping address updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setBusyId(deleting._id);
    try {
      const data = await addressApi.remove(deleting._id);
      setAddresses(data.addresses || []);
      toast.success('Address removed');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const atLimit = addresses.length >= MAX_ADDRESSES;

  return (
    <div className="container-page py-8 lg:py-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My account', to: '/account' }, { label: 'Addresses' }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Shipping addresses</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Save up to {MAX_ADDRESSES} addresses. Your default is pre-selected at checkout.
          </p>
        </div>
        <Button onClick={openCreate} disabled={atLimit} icon={<Icon name="plus" className="h-4 w-4" />}>
          Add new address
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <AccountNav />

        <div className="min-w-0">
          {atLimit && (
            <Alert className="mb-5" variant="info" title="Address limit reached">
              Remove an address before adding a new one.
            </Alert>
          )}

          {error ? (
            <ErrorState error={error} onRetry={load} />
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((key) => (
                <Skeleton key={key} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50/40">
              <EmptyState
                icon="map-pin"
                title="No saved addresses"
                description="Add a delivery address now so checkout takes seconds."
                action={<Button onClick={openCreate}>Add your first address</Button>}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((address) => (
                <AddressCard
                  key={address._id}
                  address={address}
                  onEdit={() => openEdit(address)}
                  onDelete={() => setDeleting(address)}
                  onSetDefault={() => makeDefault(address)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddressModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={save}
        address={editing}
        submitting={submitting}
        title={editing ? 'Edit address' : 'Add a new address'}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busyId === deleting?._id}
        title="Delete this address?"
        confirmLabel="Delete address"
        variant="danger"
      >
        {deleting && (
          <p className="text-sm text-ink-600">
            {deleting.fullName}, {deleting.addressLine1}, {deleting.city} will be removed from your address book. This
            cannot be undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
