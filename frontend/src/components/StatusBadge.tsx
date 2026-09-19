import type { ShipmentStatus } from '../types';

interface StatusBadgeProps {
  status: ShipmentStatus;
}

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  CUSTOMS_HOLD: 'Customs Hold',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
