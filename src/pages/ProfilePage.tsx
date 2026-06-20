import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { fetchUserById, fetchBuildings, fetchAlertPreferences } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/utils/format';
import type { ManagedUser, UserAlertPreference } from '@/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState<ManagedUser | null>(null);
  const [buildings, setBuildings] = useState<string>('');
  const [prefs, setPrefs] = useState<UserAlertPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (user?.id == null) { setLoading(false); return; }
      const [mu, bs, p] = await Promise.all([
        fetchUserById(user.id),
        fetchBuildings(user).catch(() => []),
        fetchAlertPreferences(user.id).catch(() => []),
      ]);
      setMe(mu);
      if (mu) {
        const map: Record<number, string> = {};
        for (const b of bs) map[b.id] = b.building_name;
        setBuildings(mu.building_ids.map((id) => map[id] || `#${id}`).join(', '));
      }
      setPrefs(p);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!me) return <div className="py-20 text-center text-muted-foreground">Profile unavailable.</div>;

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">My Profile</h3>
          <p className="text-sm text-muted-foreground">Your account details</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}><KeyRound className="h-4 w-4" /> Settings</Button>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{me.username.charAt(0).toUpperCase()}</span>
          <div>
            <h3 className="text-lg font-bold">{`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || me.username}</h3>
            <div className="flex flex-wrap gap-2">
              {me.roles.length ? me.roles.map((r) => <Badge key={r} variant="water">{r}</Badge>) : <span className="text-sm text-muted-foreground">No roles</span>}
            </div>
          </div>
        </div>
        <div>
          <Row label="Username" value={me.username} />
          <Row label="Email" value={me.email} />
          <Row label="Mobile No." value={me.mobile_no} />
          <Row label="Reports To" value={me.parent_username} />
          <Row label="Organization" value={me.organization_name} />
          <Row label="Building Access" value={buildings || '—'} />
          <Row label="Last Login" value={formatDateTime(me.last_login)} />
          <Row label="Member Since" value={formatDate(me.created_at)} />
          <Row
            label="Alert Preferences"
            value={
              prefs.length === 0 ? '—' : (
                <ul className="flex flex-col gap-1">
                  {prefs.map((p, i) => (
                    <li key={i} className="text-sm">
                      <Badge variant={p.is_enabled ? 'ok' : 'off'}>{p.channel}</Badge> {p.destination}
                      {p.alert_type ? ` · ${p.alert_type}` : ''}{p.severity_level ? ` · ${p.severity_level}` : ''}
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
