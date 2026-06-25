import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { fetchPanelById, deletePanel } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PANEL_STATUS_META, formatDateTime } from '@/utils/format';
import type { Panel } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function PanelAdminDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPanelById(Number(id)).then(setPanel).finally(() => setLoading(false));
  }, [id]);

  async function confirmDelete() {
    try {
      await deletePanel(Number(id));
      navigate('/panel-management');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setShowDelete(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!panel) return <div className="py-20 text-center text-muted-foreground">Panel not found.</div>;

  const meta = PANEL_STATUS_META[panel.status] ?? PANEL_STATUS_META.NORMAL;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/panel-management')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Panel Management
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/panels/${panel.id}`)}>
            <ExternalLink className="h-4 w-4" /> View Zones
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/panel-management/${panel.id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-lg font-bold">{panel.panel_name || panel.panel_code}</h3>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <Row label="ID" value={panel.id} />
        <Row label="Panel Code" value={<span className="font-mono text-xs">{panel.panel_code}</span>} />
        <Row label="Panel Name" value={panel.panel_name} />
        <Row label="Building" value={panel.building_name} />
        <Row label="Status" value={<Badge variant={meta.variant}>{meta.label}</Badge>} />
        <Row label="Last Seen" value={formatDateTime(panel.last_seen)} />
        <Row label="Notes" value={panel.notes} />
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete panel?</DialogTitle>
            <DialogDescription>Delete <strong>{panel.panel_code}</strong> and all its zones?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
