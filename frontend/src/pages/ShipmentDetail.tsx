import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import type { Shipment, ShipmentStatus } from '../types';
import { ALLOWED_TRANSITIONS } from '../types';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  CUSTOMS_HOLD: 'Customs Hold',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [newStatus, setNewStatus] = useState<ShipmentStatus | ''>('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const s = await api.getShipment(id);
      setShipment(s);
      setNewStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const allowedNext = shipment
    ? (ALLOWED_TRANSITIONS[shipment.currentStatus] ?? [])
    : [];

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment || !newStatus) return;

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const updated = await api.updateStatus(shipment.id, {
        status: newStatus,
        note: note.trim() || undefined,
      });
      setShipment(updated);
      setNote('');
      setNewStatus('');
      setUpdateSuccess(`Status updated to ${STATUS_LABELS[newStatus]}`);
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="loading">Loading shipment…</p>;
  if (error) return (
    <div>
      <div className="alert alert-error">{error}</div>
      <Link to="/" className="btn btn-outline">← Back to Dashboard</Link>
    </div>
  );
  if (!shipment) return <p className="empty">Shipment not found.</p>;

  const isTerminal =
    shipment.currentStatus === 'DELIVERED' || shipment.currentStatus === 'CANCELLED';

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>← Dashboard</Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {shipment.referenceNumber}
          </h1>
        </div>
        <StatusBadge status={shipment.currentStatus} />
      </div>

      {/* Shipment Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Shipment Details</h2>
        <div className="detail-grid">
          <div>
            <div className="detail-label">Reference Number</div>
            <div className="detail-value"><code>{shipment.referenceNumber}</code></div>
          </div>
          <div>
            <div className="detail-label">Current Status</div>
            <div className="detail-value"><StatusBadge status={shipment.currentStatus} /></div>
          </div>
          <div>
            <div className="detail-label">Origin</div>
            <div className="detail-value">{shipment.origin}</div>
          </div>
          <div>
            <div className="detail-label">Destination</div>
            <div className="detail-value">{shipment.destination}</div>
          </div>
          <div>
            <div className="detail-label">Expected Delivery</div>
            <div className="detail-value">{formatDate(shipment.expectedDeliveryDate)}</div>
          </div>
          <div>
            <div className="detail-label">Created</div>
            <div className="detail-value">{formatDateTime(shipment.createdAt)}</div>
          </div>
          <div>
            <div className="detail-label">Last Updated</div>
            <div className="detail-value">{formatDateTime(shipment.updatedAt)}</div>
          </div>
        </div>

        {/* Status Update */}
        {isTerminal ? (
          <div className="alert alert-info" style={{ marginTop: 16, marginBottom: 0 }}>
            This shipment is in a terminal state (<strong>{STATUS_LABELS[shipment.currentStatus]}</strong>)
            and cannot be updated further.
          </div>
        ) : (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <h3 className="section-title">Update Status</h3>

            {updateError && <div className="alert alert-error">{updateError}</div>}
            {updateSuccess && <div className="alert alert-success">{updateSuccess}</div>}

            {allowedNext.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                No status transitions available from {STATUS_LABELS[shipment.currentStatus]}.
              </p>
            ) : (
              <form onSubmit={handleStatusUpdate}>
                <div className="status-update-row">
                  <div className="form-group">
                    <label className="form-label">New Status</label>
                    <select
                      className="form-control"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                      disabled={updating}
                      style={{ minWidth: 180 }}
                    >
                      <option value="">Select status…</option>
                      {allowedNext.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Note (optional)</label>
                    <input
                      className="form-control"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note about this status change…"
                      maxLength={500}
                      disabled={updating}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">&nbsp;</label>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={updating || !newStatus}
                    >
                      {updating ? 'Updating…' : 'Update'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* History Timeline */}
      <div className="card">
        <h2 className="section-title">Status History</h2>
        <Timeline history={shipment.statusHistory} />
      </div>
    </div>
  );
}
