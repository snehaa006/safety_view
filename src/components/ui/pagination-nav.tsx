import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './button';

interface Props {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  showing: number;
  total: number;
}

export function PaginationNav({ page, totalPages, onPrev, onNext, showing, total }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
      <span>{showing} of {total} entries</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          disabled={page === 0} onClick={onPrev}
          title="Previous page"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[80px] text-center">Page {page + 1} / {totalPages}</span>
        <Button
          variant="outline" size="icon" className="h-7 w-7"
          disabled={page >= totalPages - 1} onClick={onNext}
          title="Next page"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
