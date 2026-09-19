import type {
  Shipment,
  PaginatedResponse,
  CreateShipmentPayload,
  UpdateStatusPayload,
  ShipmentStatusHistory,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    const message = body.error || `HTTP ${res.status}`;
    const err = new Error(message) as Error & { details?: unknown; status?: number };
    err.details = body.details;
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export interface ListShipmentsParams {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const api = {
  // Health
  health: () => request<{ status: string; timestamp: string }>('/health'),

  // Shipments
  listShipments: (params: ListShipmentsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const queryString = qs.toString();
    return request<PaginatedResponse<Shipment>>(
      `/api/shipments${queryString ? `?${queryString}` : ''}`
    );
  },

  getShipment: (id: string) =>
    request<Shipment>(`/api/shipments/${id}`),

  createShipment: (payload: CreateShipmentPayload) =>
    request<Shipment>('/api/shipments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStatus: (id: string, payload: UpdateStatusPayload) =>
    request<Shipment>(`/api/shipments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getHistory: (id: string) =>
    request<ShipmentStatusHistory[]>(`/api/shipments/${id}/history`),
};
