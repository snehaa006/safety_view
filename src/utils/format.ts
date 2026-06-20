import type { PanelStatus, ZoneState } from '@/types';

export interface Meta {
  label: string;
  badge: string; // pill classes
  tile: string; // bg+border+text
  dot: string; // dot color
}

export const ZONE_STATE_META: Record<ZoneState, Meta> = {
  HEALTHY: {
    label: 'Healthy',
    badge: 'bg-ok-bg text-ok-text border border-ok-border',
    tile: 'bg-ok-bg border-ok-border text-ok-text',
    dot: 'bg-ok-strong',
  },
  FIRE: {
    label: 'Fire',
    badge: 'bg-crit-bg text-crit-text border border-crit-border',
    tile: 'bg-crit-bg border-crit-border text-crit-text',
    dot: 'bg-crit-strong',
  },
  FAULT: {
    label: 'Fault',
    badge: 'bg-warn-bg text-warn-text border border-warn-border',
    tile: 'bg-warn-bg border-warn-border text-warn-text',
    dot: 'bg-warn-strong',
  },
  ISOLATION: {
    label: 'Isolation',
    badge: 'bg-off-bg text-off-text border border-off-border',
    tile: 'bg-off-bg border-off-border text-off-text',
    dot: 'bg-off-text',
  },
};

export function zoneStateMeta(state: ZoneState | string): Meta {
  return ZONE_STATE_META[state as ZoneState] ?? ZONE_STATE_META.HEALTHY;
}

export const PANEL_STATUS_META: Record<PanelStatus, { label: string; variant: 'ok' | 'warn' | 'destructive' | 'off' }> = {
  NORMAL: { label: 'Normal', variant: 'ok' },
  ALARM: { label: 'Alarm', variant: 'destructive' },
  FAULT: { label: 'Fault', variant: 'warn' },
  OFFLINE: { label: 'Offline', variant: 'off' },
};

export function severityMeta(severity: string): { label: string; className: string } {
  switch ((severity || '').toUpperCase()) {
    case 'CRITICAL':
      return { label: 'Critical', className: 'bg-crit-bg text-crit-text' };
    case 'HIGH':
      return { label: 'High', className: 'bg-fire-bg text-fire-text' };
    case 'MEDIUM':
      return { label: 'Medium', className: 'bg-warn-bg text-warn-text' };
    default:
      return { label: severity || 'Low', className: 'bg-ok-bg text-ok-text' };
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
  return new Date(isoString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
