import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil } from 'lucide-react';
import { fetchUserById } from '@/services/api';
import { parseTodos } from '@/lib/todos';
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
          <Row label="User ID" value={user.customer_id} />
          <Row label="Username" value={user.username} />
          <Row label="Email" value={user.email} />
          <Row label="First Name" value={user.first_name} />
          <Row label="Last Name" value={user.last_name} />
          <Row label="Mobile No." value={user.mobile_no} />
          <Row label="Role" value={String(user.role).replace(/_/g, ' ')} />
          <Row label="Hierarchy Level" value={user.hierarchy_level} />
          <Row label="Reports To (user id)" value={user.parent_user_id} />
          <Row label="Group" value={user.group_name} />
          <Row label="Building" value={user.building_name} />
          <Row label="Managed Location" value={user.location_name} />
          <Row label="Organization" value={user.organization_name || user.org_name} />
          <Row label="Device Type" value={user.device_type} />
          <Row label="Primary Device" value={user.device_uuid} />
          <Row label="Assigned Devices" value={devices.length ? devices.join(', ') : '—'} />
          <Row label="Alert Email" value={user.alert_email_enabled ? 'Enabled' : 'Disabled'} />
          <Row label="Alert Email List" value={user.alert_emails.length ? user.alert_emails.join(', ') : '—'} />
          <Row label="Active" value={user.is_active ? 'Yes' : 'No'} />
          <Row label="Last Login" value={user.last_login ? new Date(user.last_login).toLocaleString() : '—'} />
          <Row label="Created" value={formatDate(user.created_at)} />
          <Row label="Updated At" value={user.updated_at ? new Date(user.updated_at).toLocaleString() : '—'} />
          <Row
            label="Organization Logo"
            value={
              user.organization_logo ? (
                <img src={user.organization_logo} alt="logo" className="h-8 w-8 rounded object-contain" />
              ) : (
                '—'
              )
            }
          />
          <Row
            label="Notes / To-do"
            value={
              parseTodos(user.remarks).length === 0 ? (
                '—'
              ) : (
                <ul className="flex flex-col gap-1">
                  {parseTodos(user.remarks).map((t, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                          t.done ? 'border-ok-strong bg-ok-bg text-ok-text' : 'border-border'
                        }`}
                      >
                        {t.done ? '✓' : ''}
                      </span>
                      <span className={t.done ? 'text-muted-foreground line-through' : ''}>{t.text}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          />
        </div>
      </Card>
    </section>
  );
}
