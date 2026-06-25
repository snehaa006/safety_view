import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-6 w-6 rounded-full border-2 border-border border-t-primary',
        'animate-spin',
        className,
      )}
    />
  );
}

export function LoadingScreen({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Spinner className="h-8 w-8" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
