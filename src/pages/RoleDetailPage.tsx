import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Users } from 'lucide-react';
import { fetchRoleById, deleteRole } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Role } from '@/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function RoleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoleById(Number(id)).then(setRole).finally(() => setLoading(false));
  }, [id]);

  async function confirmDelete() {
    try {
      await deleteRole(Number(id));
      navigate('/roles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setShowDelete(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!role) return <div className="py-20 text-center text-muted-foreground">Role not found.</div>;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/roles')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Roles
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/users?role=${encodeURIComponent(role.role_name)}`)}>
            <Users className="h-4 w-4" /> View Users
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/roles/${role.id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{role.role_name}</h3>
        <Row label="ID" value={role.id} />
        <Row label="Role Name" value={role.role_name} />
        <Row label="Description" value={role.description} />
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete role?</DialogTitle>
            <DialogDescription>Delete <strong>{role.role_name}</strong>? Users assigned this role will lose it.</DialogDescription>
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
