// ---------------------------------------------------------------------------
// Content drawn inside a shape (Figma-style), rendered by the graphics engine
// via `renderShapeOverlay`. Shows the linked zone's LIVE data (number, name,
// current state, reading). Pointer events are disabled so the shape underneath
// stays interactive.
// ---------------------------------------------------------------------------

import type { Zone } from '@/types';
import { UNASSIGNED_COLORS, zoneColors } from './zoneStyle';

export default function ZoneOverlay({ zone, compact }: { zone: Zone | null; compact?: boolean }) {
  if (!zone) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: UNASSIGNED_COLORS.text,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 11,
          textAlign: 'center',
          padding: 4,
        }}
      >
        Unassigned
      </div>
    );
  }

  const c = zoneColors(zone.current_state);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: c.text,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: 4,
        overflow: 'hidden',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: compact ? 13 : 16, lineHeight: 1.1, letterSpacing: '0.02em', textShadow: '0 1px 2px rgba(255,255,255,0.7)' }}>
        ZONE-{zone.zone_number}
      </div>
      {!compact && zone.zone_name && (
        <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(255,255,255,0.7)' }}>
          {zone.zone_name}
        </div>
      )}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: 999,
          background: c.stroke,
          color: '#fff',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff', opacity: 0.9 }} />
        {c.label}
      </div>
      {!compact && zone.current_reading != null && (
        <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>{zone.current_reading}</div>
      )}
    </div>
  );
}
