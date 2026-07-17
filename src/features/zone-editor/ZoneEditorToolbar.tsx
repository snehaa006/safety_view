// ---------------------------------------------------------------------------
// Figma-style vertical tool rail for the Zone Editor.
// ---------------------------------------------------------------------------

import {
  Circle as CircleIcon, Hand, Minus, MousePointer2, PenTool, Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/graphics';

const TOOLS: { tool: ToolType; label: string; icon: typeof Square; hint: string }[] = [
  { tool: 'select', label: 'Select', icon: MousePointer2, hint: 'Select, move & resize (V)' },
  { tool: 'rectangle', label: 'Rectangle', icon: Square, hint: 'Draw a rectangle (R)' },
  { tool: 'circle', label: 'Circle', icon: CircleIcon, hint: 'Draw a circle / ellipse (O)' },
  { tool: 'line', label: 'Line', icon: Minus, hint: 'Draw a line (L)' },
  { tool: 'polygon', label: 'Polygon', icon: PenTool, hint: 'Click to add points, double-click to close (P)' },
  { tool: 'pan', label: 'Pan', icon: Hand, hint: 'Pan the canvas (Space)' },
];

export default function ZoneEditorToolbar({
  tool,
  onToolChange,
}: {
  tool: ToolType;
  onToolChange: (t: ToolType) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-1.5 shadow-sm">
      {TOOLS.map(({ tool: t, label, icon: Icon, hint }) => (
        <button
          key={t}
          type="button"
          title={hint}
          aria-label={label}
          aria-pressed={tool === t}
          onClick={() => onToolChange(t)}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            tool === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      ))}
    </div>
  );
}

export { TOOLS };
