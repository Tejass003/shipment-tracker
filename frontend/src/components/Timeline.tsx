import type { ShipmentStatusHistory } from '../types';
import StatusBadge from './StatusBadge';

interface TimelineProps {
  history: ShipmentStatusHistory[];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const DOT_CLASS: Record<string, string> = {
  DELIVERED: 'timeline-dot-DELIVERED',
  CANCELLED: 'timeline-dot-CANCELLED',
  CUSTOMS_HOLD: 'timeline-dot-CUSTOMS_HOLD',
};

export default function Timeline({ history }: TimelineProps) {
  if (history.length === 0) {
    return <p className="empty">No status history available.</p>;
  }

  return (
    <ul className="timeline">
      {history.map((entry) => (
        <li key={entry.id} className="timeline-item">
          <div className={`timeline-dot ${DOT_CLASS[entry.status] ?? ''}`} />
          <div className="timeline-body">
            <StatusBadge status={entry.status} />
            <p className="timeline-time">{formatDateTime(entry.changedAt)}</p>
            {entry.note && <p className="timeline-note">"{entry.note}"</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
