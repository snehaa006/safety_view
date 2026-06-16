import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil } from 'lucide-react';
import { fetchUserById } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';
import type { ManagedUser } from '@/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-48 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setUser(await fetchUserById(Number(id)));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <div className="py-20 text-center text-muted-foreground">User not found.</div>;

  const devices = user.assigned_device_uuids.length
    ? user.assigned_device_uuids
    : user.device_uuid
    ? [user.device_uuid]
    : [];

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Users
        </button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}/edit`)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <h3 className="text-lg font-bold">{user.username}</h3>
            <div className="flex items-center gap-2">
              <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'water'}>
                {String(user.role).replace(/_/g, ' ')}
              </Badge>
              <span className={user.is_active ? 'text-sm text-ok-text' : 'text-sm text-muted-foreground'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <Row label="ID" value={user.id} />
          <Row label="Username" value={user.username} />
          <Row label="Email" value={user.email} />
          <Row label="First Name" value={user.first_name} />
          <Row label="Last Name" value={user.last_name} />
          <Row label="Mobile No." value={user.mobile_no} />
          <Row label="Role" value={String(user.role).replace(/_/g, ' ')} />
          <Row label="Group" value={user.group_name} />
          <Row label="Primary Device" value={user.device_uuid} />
          <Row
            label="Assigned Devices"
            value={devices.length ? devices.join(', ') : '—'}
          />
          <Row label="Organisation" value={user.org_name} />
          <Row label="Active" value={user.is_active ? 'Yes' : 'No'} />
          <Row label="Created" value={formatDate(user.created_at)} />
        </div>
      </Card>
    </section>
  );
}
