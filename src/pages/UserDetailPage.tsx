import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil } from 'lucide-react';
import { fetchUserById, fetchBuildings } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/utils/format';
import type { ManagedUser } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-48 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [u, setU] = useState<ManagedUser | null>(null);
  const [buildingNames, setBuildingNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [mu, bs] = await Promise.all([fetchUserById(Number(id)), fetchBuildings(currentUser).catch(() => [])]);
      setU(mu);
      const map: Record<number, string> = {};
      for (const b of bs) map[b.id] = b.building_name;
      setBuildingNames(map);
      setLoading(false);
    })();
  }, [id, currentUser]);

  if (loading) return <LoadingScreen />;
  if (!u) return <div className="py-20 text-center text-muted-foreground">User not found.</div>;

  const buildings = u.building_ids.map((bid) => buildingNames[bid] || `#${bid}`).join(', ');

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/users')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Users
        </button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/users/${u.id}/edit`)}><Pencil className="h-4 w-4" /> Edit</Button>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{u.username.charAt(0).toUpperCase()}</span>
          <div>
            <h3 className="text-lg font-bold">{`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {u.roles.length ? u.roles.map((r) => <Badge key={r} variant="water">{r}</Badge>) : <span className="text-sm text-muted-foreground">No roles</span>}
              <span className={u.is_active ? 'text-sm text-ok-text' : 'text-sm text-muted-foreground'}>{u.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        <div>
          <Row label="ID" value={u.id} />
          <Row label="Username" value={u.username} />
          <Row label="Email" value={u.email} />
          <Row label="Mobile No." value={u.mobile_no} />
          <Row label="Reports To" value={u.parent_username} />
          <Row label="Organization" value={u.organization_name} />
          <Row label="Building Access" value={buildings || '—'} />
          <Row label="Last Login" value={formatDateTime(u.last_login)} />
          <Row label="Created" value={formatDate(u.created_at)} />
          <Row label="Updated" value={formatDateTime(u.updated_at)} />
          <Row label="Notes" value={u.remarks} />
        </div>
      </Card>
    </section>
  );
}
