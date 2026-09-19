import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Shipment, ShipmentStatus, PaginatedResponse } from '../types';
import { ALL_STATUSES } from '../types';
import StatusBadge from '../components/StatusBadge';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  CUSTOMS_HOLD: 'Customs Hold',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<Shipment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get('q') || '';
  const status = (searchParams.get('status') as ShipmentStatus | '') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listShipments({
        q: q || undefined,
        status: status || undefined,
        page,
        limit: 20,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Shipments</h1>
        <Link to="/create" className="btn btn-primary">+ New Shipment</Link>
      </div>

      {/* Controls */}
      <div className="controls">
        <input
          className="form-control"
          placeholder="Search by reference, origin, destination…"
          value={q}
          onChange={(e) => updateParam('q', e.target.value)}
        />
        <select
          className="form-control"
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {(q || status) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setSearchParams({})}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <p className="loading">Loading shipments…</p>}

      {/* Error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      {!loading && !error && data && (
        <>
          {data.data.length === 0 ? (
            <div className="card">
              <p className="empty">
                {q || status
                  ? 'No shipments match your filters.'
                  : 'No shipments yet. Create one to get started.'}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Expected Delivery</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((shipment) => (
                      <tr key={shipment.id}>
                        <td>
                          <code style={{ fontSize: 13 }}>{shipment.referenceNumber}</code>
                        </td>
                        <td>{shipment.origin}</td>
                        <td>{shipment.destination}</td>
                        <td><StatusBadge status={shipment.currentStatus} /></td>
                        <td>{formatDate(shipment.expectedDeliveryDate)}</td>
                        <td>
                          <Link
                            to={`/shipments/${shipment.id}`}
                            className="btn btn-outline btn-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                ← Prev
              </button>
              <span>
                Page {page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                Next →
              </button>
            </div>
          )}

          {data.data.length > 0 && data.pagination.totalPages <= 1 && (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>
              Showing {data.data.length} of {data.pagination.total} shipment(s)
            </p>
          )}
        </>
      )}
    </div>
  );
}
