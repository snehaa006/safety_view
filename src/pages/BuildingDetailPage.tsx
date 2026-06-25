import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { fetchBuildingById, deleteBuilding, locationLabel } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Building } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function BuildingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBuildingById(Number(id)).then(setBuilding).finally(() => setLoading(false));
  }, [id]);

  async function confirmDelete() {
    try {
      await deleteBuilding(Number(id));
      navigate('/building-management');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setShowDelete(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!building) return <div className="py-20 text-center text-muted-foreground">Building not found.</div>;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/building-management')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Building Management
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/buildings/${building.id}`)}>
            <ExternalLink className="h-4 w-4" /> View Panels
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/building-management/${building.id}/edit`)}>
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
          <h3 className="text-lg font-bold">{building.building_name}</h3>
          {building.group_name && <Badge variant="water">{building.group_name}</Badge>}
        </div>
        <Row label="ID" value={building.id} />
        <Row label="Building Name" value={building.building_name} />
        <Row label="Group" value={building.group_name} />
        <Row label="Location" value={locationLabel(building.location)} />
        {building.location && (
          <>
            <Row label="Address" value={building.location.address} />
            <Row label="City" value={building.location.city} />
            <Row label="State" value={building.location.state} />
            <Row label="Country" value={building.location.country} />
            <Row label="Postal Code" value={building.location.postal_code} />
          </>
        )}
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete building?</DialogTitle>
            <DialogDescription>Delete <strong>{building.building_name}</strong>? Its panels and zones will lose their building link.</DialogDescription>
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
