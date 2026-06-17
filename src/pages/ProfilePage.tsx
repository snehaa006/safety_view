import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { fetchUserById } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { parseTodos } from '@/lib/todos';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';
import type { ManagedUser } from '@/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-48 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (user?.id != null) setMe(await fetchUserById(user.id));
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!me) return <div className="py-20 text-center text-muted-foreground">Profile unavailable.</div>;

  const todos = parseTodos(me.remarks);
  const devices = me.assigned_device_uuids.length ? me.assigned_device_uuids : me.device_uuid ? [me.device_uuid] : [];

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">My Profile</h3>
          <p className="text-sm text-muted-foreground">Your account details</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
          <KeyRound className="h-4 w-4" /> Change Password
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {me.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <h3 className="text-lg font-bold">{`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || me.username}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="water">{String(me.role).replace(/_/g, ' ')}</Badge>
              <span className={me.is_active ? 'text-sm text-ok-text' : 'text-sm text-muted-foreground'}>
                {me.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <Row label="Username" value={me.username} />
          <Row label="User ID" value={me.customer_id} />
          <Row label="Email" value={me.email} />
          <Row label="Mobile No." value={me.mobile_no} />
          <Row label="Organization" value={me.organization_name || me.org_name} />
          <Row label="Managed Location" value={me.location_name} />
          <Row label="Group" value={me.group_name} />
          <Row label="Building" value={me.building_name} />
          <Row label="Devices" value={devices.length ? devices.join(', ') : '—'} />
          <Row label="Alert Email" value={me.alert_email_enabled ? 'Enabled' : 'Disabled'} />
          <Row label="Alert Email List" value={me.alert_emails.length ? me.alert_emails.join(', ') : '—'} />
          <Row label="Last Login" value={me.last_login ? new Date(me.last_login).toLocaleString() : '—'} />
          <Row label="Member Since" value={formatDate(me.created_at)} />
          <Row
            label="Notes / To-do"
            value={
              todos.length === 0 ? (
                '—'
              ) : (
                <ul className="flex flex-col gap-1">
                  {todos.map((t, i) => (
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
