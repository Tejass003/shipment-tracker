import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { ShipmentStatus, CreateShipmentPayload } from '../types';
import { ALL_STATUSES } from '../types';

type FormErrors = Partial<Record<keyof CreateShipmentPayload | 'root', string>>;

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  CUSTOMS_HOLD: 'Customs Hold',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Initial statuses that make sense when creating (exclude terminal states)
const INITIAL_STATUSES: ShipmentStatus[] = ['BOOKED', 'IN_TRANSIT'];

function validate(form: CreateShipmentPayload): FormErrors {
  const errors: FormErrors = {};
  if (!form.referenceNumber.trim()) errors.referenceNumber = 'Reference number is required';
  else if (!/^[A-Za-z0-9_-]+$/.test(form.referenceNumber))
    errors.referenceNumber = 'Only letters, digits, hyphens and underscores allowed';
  if (!form.origin.trim()) errors.origin = 'Origin is required';
  if (!form.destination.trim()) errors.destination = 'Destination is required';
  if (!form.currentStatus) errors.currentStatus = 'Initial status is required';
  if (!form.expectedDeliveryDate) errors.expectedDeliveryDate = 'Expected delivery date is required';
  return errors;
}

export default function CreateShipment() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateShipmentPayload>({
    referenceNumber: '',
    origin: '',
    destination: '',
    currentStatus: '' as unknown as ShipmentStatus,
    expectedDeliveryDate: '',
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof CreateShipmentPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const shipment = await api.createShipment({
        ...form,
        referenceNumber: form.referenceNumber.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        note: form.note?.trim() || 'Shipment created',
      });
      navigate(`/shipments/${shipment.id}`);
    } catch (err) {
      const e = err as Error & { details?: { path: string; message: string }[] };
      if (e.details) {
        const fieldErrors: FormErrors = {};
        e.details.forEach(({ path, message }) => {
          fieldErrors[path as keyof CreateShipmentPayload] = message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ root: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h1 className="page-title">New Shipment</h1>
      </div>

      {errors.root && <div className="alert alert-error">{errors.root}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="ref">Reference Number</label>
            <input
              id="ref"
              className={`form-control ${errors.referenceNumber ? 'error' : ''}`}
              value={form.referenceNumber}
              onChange={(e) => update('referenceNumber', e.target.value)}
              placeholder="e.g. SHIP-2024-001"
              maxLength={50}
              disabled={submitting}
            />
            {errors.referenceNumber && <span className="form-error">{errors.referenceNumber}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="origin">Origin</label>
            <input
              id="origin"
              className={`form-control ${errors.origin ? 'error' : ''}`}
              value={form.origin}
              onChange={(e) => update('origin', e.target.value)}
              placeholder="e.g. Mumbai, India"
              maxLength={100}
              disabled={submitting}
            />
            {errors.origin && <span className="form-error">{errors.origin}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dest">Destination</label>
            <input
              id="dest"
              className={`form-control ${errors.destination ? 'error' : ''}`}
              value={form.destination}
              onChange={(e) => update('destination', e.target.value)}
              placeholder="e.g. New York, USA"
              maxLength={100}
              disabled={submitting}
            />
            {errors.destination && <span className="form-error">{errors.destination}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Initial Status</label>
            <select
              id="status"
              className={`form-control ${errors.currentStatus ? 'error' : ''}`}
              value={form.currentStatus}
              onChange={(e) => update('currentStatus', e.target.value as ShipmentStatus)}
              disabled={submitting}
            >
              <option value="" disabled>Select Initial Status…</option>
              {INITIAL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            {errors.currentStatus && <span className="form-error">{errors.currentStatus}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="date">Expected Delivery Date</label>
            <input
              id="date"
              type="date"
              className={`form-control ${errors.expectedDeliveryDate ? 'error' : ''}`}
              value={form.expectedDeliveryDate}
              onChange={(e) => update('expectedDeliveryDate', e.target.value)}
              disabled={submitting}
            />
            {errors.expectedDeliveryDate && (
              <span className="form-error">{errors.expectedDeliveryDate}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note">Note (optional)</label>
            <input
              id="note"
              className="form-control"
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              placeholder="Initial note about this shipment"
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Shipment'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/')}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
