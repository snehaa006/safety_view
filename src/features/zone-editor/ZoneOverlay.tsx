// ---------------------------------------------------------------------------
// Content drawn inside a shape (Figma-style), rendered by the graphics engine
// via `renderShapeOverlay`. Shows the linked zone's LIVE data (number, name,
// current state, reading) in bold white text with a dark outline so it stays
// legible on any fill / floor-plan photo. Pointer events are disabled so the
// shape underneath stays interactive.
// ---------------------------------------------------------------------------

import type { Zone } from '@/types';
import { UNASSIGNED_COLORS, zoneColors } from './zoneStyle';

// Multi-directional shadow = a crisp text outline that reads on any background.
const OUTLINE = '0 0 3px rgba(0,0,0,0.55), 1px 1px 0 rgba(0,0,0,0.65), -1px 1px 0 rgba(0,0,0,0.65), 1px -1px 0 rgba(0,0,0,0.65), -1px -1px 0 rgba(0,0,0,0.65)';

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
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 14,
          textAlign: 'center',
          padding: 4,
          textShadow: OUTLINE,
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
        gap: 3,
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: compact ? 16 : 24,
          lineHeight: 1.08,
          letterSpacing: '0.01em',
          textShadow: OUTLINE,
          maxWidth: '100%',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {zone.zone_name || `Zone ${zone.zone_number}`}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 800,
          padding: '2px 9px',
          borderRadius: 999,
          background: c.stroke,
          color: '#fff',
          border: '1.5px solid rgba(255,255,255,0.7)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: '#fff' }} />
        {c.label.toUpperCase()}
      </div>
      {!compact && zone.current_reading != null && (
        <div style={{ fontSize: 13, fontWeight: 800, textShadow: OUTLINE }}>{zone.current_reading}</div>
      )}
    </div>
  );
}
