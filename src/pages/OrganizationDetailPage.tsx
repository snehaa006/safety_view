import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Users } from 'lucide-react';
import { fetchOrganizationById, deleteOrganization } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/utils/format';
import type { Organization } from '@/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizationById(Number(id)).then(setOrg).finally(() => setLoading(false));
  }, [id]);

  async function confirmDelete() {
    try {
      await deleteOrganization(Number(id));
      navigate('/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setShowDelete(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!org) return <div className="py-20 text-center text-muted-foreground">Organization not found.</div>;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/organizations')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Organizations
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/users?org=${encodeURIComponent(org.organization_name)}`)}>
            <Users className="h-4 w-4" /> View Users
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/organizations/${org.id}/edit`)}>
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
          <h3 className="text-lg font-bold">{org.organization_name}</h3>
          <Badge variant={org.is_active ? 'ok' : 'off'}>{org.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
        <Row label="ID" value={org.id} />
        <Row label="Name" value={org.organization_name} />
        <Row label="Status" value={<Badge variant={org.is_active ? 'ok' : 'off'}>{org.is_active ? 'Active' : 'Inactive'}</Badge>} />
        <Row label="Logo Path" value={org.logo_path} />
        <Row label="Created" value={formatDate(org.created_at)} />
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization?</DialogTitle>
            <DialogDescription>Delete <strong>{org.organization_name}</strong>? Users linked to it will lose the organization reference.</DialogDescription>
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
