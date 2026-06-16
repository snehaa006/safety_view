import type { ZoneStatus } from '@/types';

export interface StatusMeta {
  label: string;
  /** badge / pill classes */
  badge: string;
  /** tile background + border + text classes */
  tile: string;
  /** small status dot color class */
  dot: string;
  /** strong accent text class */
  strong: string;
}

export const ZONE_STATUS_META: Record<ZoneStatus, StatusMeta> = {
  NORMAL: {
    label: 'Normal',
    badge: 'bg-ok-bg text-ok-text border border-ok-border',
    tile: 'bg-ok-bg border-ok-border text-ok-text',
    dot: 'bg-ok-strong',
    strong: 'text-ok-strong',
  },
  ALARM: {
    label: 'Fire Alarm',
    badge: 'bg-crit-bg text-crit-text border border-crit-border',
    tile: 'bg-crit-bg border-crit-border text-crit-text',
    dot: 'bg-crit-strong',
    strong: 'text-crit-strong',
  },
  FAULT: {
    label: 'Fault',
    badge: 'bg-warn-bg text-warn-text border border-warn-border',
    tile: 'bg-warn-bg border-warn-border text-warn-text',
    dot: 'bg-warn-strong',
    strong: 'text-warn-strong',
  },
  OFFLINE: {
    label: 'Offline',
    badge: 'bg-off-bg text-off-text border border-off-border',
    tile: 'bg-off-bg border-off-border text-off-text',
    dot: 'bg-off-text',
    strong: 'text-off-text',
  },
};

export function zoneStatusMeta(status: ZoneStatus | string): StatusMeta {
  return ZONE_STATUS_META[status as ZoneStatus] ?? ZONE_STATUS_META.NORMAL;
}

export function severityMeta(severity: string): { label: string; className: string } {
  switch (severity) {
    case 'CRITICAL':
      return { label: 'Critical', className: 'bg-crit-bg text-crit-text' };
    case 'HIGH':
      return { label: 'High', className: 'bg-fire-bg text-fire-text' };
    case 'MEDIUM':
      return { label: 'Medium', className: 'bg-warn-bg text-warn-text' };
    default:
      return { label: 'Low', className: 'bg-ok-bg text-ok-text' };
  }
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
