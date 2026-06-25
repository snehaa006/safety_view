import type { PanelStatus, ZoneState } from '@/types';

export interface Meta {
  label: string;
  badge: string; // pill classes
  tile: string; // bg+border+text
  dot: string; // dot color
}

export const ZONE_STATE_META: Record<string, Meta> = {
  HEALTHY: {
    label: 'Healthy',
    badge: 'bg-green-100 text-green-800 border border-green-400',
    tile: 'bg-green-100 border-green-500 text-green-900',
    dot: 'bg-green-600',
  },
  FIRE: {
    label: 'Fire',
    badge: 'bg-red-100 text-red-800 border border-red-500',
    tile: 'bg-red-100 border-red-600 text-red-900',
    dot: 'bg-red-600',
  },
  FAULT: {
    label: 'Fault',
    badge: 'bg-warn-bg text-warn-text border border-warn-border',
    tile: 'bg-amber-100 border-amber-500 text-amber-900',
    dot: 'bg-amber-500',
  },
  ISOLATION: {
    label: 'Isolation',
    badge: 'bg-off-bg text-off-text border border-off-border',
    tile: 'bg-off-bg border-off-border text-off-text',
    dot: 'bg-off-text',
  },
  // Manual action states
  TEST: {
    label: 'Test',
    badge: 'bg-green-100 text-green-800 border border-green-400',
    tile: 'bg-green-100 border-green-500 text-green-900',
    dot: 'bg-green-600',
  },
  HOOTER_ON: {
    label: 'Hooter ON',
    badge: 'bg-red-100 text-red-800 border border-red-500',
    tile: 'bg-red-100 border-red-600 text-red-900',
    dot: 'bg-red-600',
  },
  HOOTER_OFF: {
    label: 'Hooter OFF',
    badge: 'bg-amber-100 text-amber-800 border border-amber-400',
    tile: 'bg-amber-100 border-amber-500 text-amber-900',
    dot: 'bg-amber-400',
  },
  RESET: {
    label: 'Reset',
    badge: 'bg-red-100 text-red-800 border border-red-500',
    tile: 'bg-red-100 border-red-600 text-red-900',
    dot: 'bg-red-600',
  },
};

export function zoneStateMeta(state: ZoneState | string): Meta {
  return ZONE_STATE_META[state] ?? ZONE_STATE_META.HEALTHY;
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
