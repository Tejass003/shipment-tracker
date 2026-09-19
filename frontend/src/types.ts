export type ShipmentStatus =
  | 'BOOKED'
  | 'IN_TRANSIT'
  | 'CUSTOMS_HOLD'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export const ALL_STATUSES: ShipmentStatus[] = [
  'BOOKED',
  'IN_TRANSIT',
  'CUSTOMS_HOLD',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export const ALLOWED_TRANSITIONS: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  BOOKED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  CUSTOMS_HOLD: ['IN_TRANSIT', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

export interface ShipmentStatusHistory {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  note: string | null;
  changedAt: string;
}

export interface Shipment {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  currentStatus: ShipmentStatus;
  expectedDeliveryDate: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: ShipmentStatusHistory[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateShipmentPayload {
  referenceNumber: string;
  origin: string;
  destination: string;
  currentStatus: ShipmentStatus;
  expectedDeliveryDate: string;
  note?: string;
}

export interface UpdateStatusPayload {
  status: ShipmentStatus;
  note?: string;
}

export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
}
