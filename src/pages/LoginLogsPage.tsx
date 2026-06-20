import { useEffect, useState } from 'react';
import { fetchLoginLogs } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/utils/format';
import type { LoginLog } from '@/types';

export default function LoginLogsPage() {
  const [rows, setRows] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { setRows(await fetchLoginLogs()); }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load login logs'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Login Logs</h3>
        <p className="text-sm text-muted-foreground">Sign-in activity for security auditing</p>
      </div>
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}
      <Card className="overflow-hidden">
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Device</TableHead>
                  <TableHead>OS</TableHead><TableHead>Browser</TableHead><TableHead>IP</TableHead><TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                    <TableCell className="font-medium">{l.username || `#${l.user_id}`}</TableCell>
                    <TableCell className="text-muted-foreground">{l.device_type}</TableCell>
                    <TableCell className="text-muted-foreground">{l.os_name || '—'}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground" title={l.browser || ''}>{l.browser || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.ip_address || '—'}</TableCell>
                    <TableCell><Badge variant={l.was_successful ? 'ok' : 'destructive'}>{l.was_successful ? 'Success' : 'Failed'}</Badge></TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No login records.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
