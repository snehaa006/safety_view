// ---------------------------------------------------------------------------
// Figma-style vertical tool rail for the mimic editor. Pointer tools on top,
// shape tools in the middle, hand/pan at the bottom, each with its shortcut.
// ---------------------------------------------------------------------------

import {
  Circle as CircleIcon, Hand, Minus, MousePointer2, PenTool, Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/graphics';

interface ToolDef { tool: ToolType; label: string; icon: typeof Square; key: string; hint: string }

const GROUPS: ToolDef[][] = [
  [{ tool: 'select', label: 'Select', icon: MousePointer2, key: 'V', hint: 'Select, move & resize' }],
  [
    { tool: 'rectangle', label: 'Rectangle', icon: Square, key: 'R', hint: 'Draw a rectangle' },
    { tool: 'circle', label: 'Circle', icon: CircleIcon, key: 'O', hint: 'Draw a circle / ellipse' },
    { tool: 'line', label: 'Line', icon: Minus, key: 'L', hint: 'Draw a line' },
    { tool: 'polygon', label: 'Polygon', icon: PenTool, key: 'P', hint: 'Click points, double-click to close' },
  ],
  [{ tool: 'pan', label: 'Pan', icon: Hand, key: 'H', hint: 'Pan the canvas (or hold Space)' }],
];

export default function ZoneEditorToolbar({
  tool,
  onToolChange,
}: {
  tool: ToolType;
  onToolChange: (t: ToolType) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col items-center gap-1">
          {gi > 0 && <div className="my-0.5 h-px w-6 bg-border" />}
          {group.map(({ tool: t, label, icon: Icon, key, hint }) => (
            <button
              key={t}
              type="button"
              title={`${hint} (${key})`}
              aria-label={label}
              aria-pressed={tool === t}
              onClick={() => onToolChange(t)}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                tool === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span
                className={cn(
                  'pointer-events-none absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none',
                  tool === t ? 'text-primary-foreground/70' : 'text-muted-foreground/50',
                )}
              >
                {key}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
