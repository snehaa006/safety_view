import { useEffect, useState } from 'react';
import { fetchLoginLogs } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaginationNav } from '@/components/ui/pagination-nav';
import { LoadingScreen } from '@/components/ui/spinner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/utils/format';
import type { LoginLog } from '@/types';

const PAGE_SIZE = 20;

export default function LoginLogsPage() {
  const [rows, setRows] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try { setRows(await fetchLoginLogs()); }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load login logs'); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Login Logs</h3>
        <p className="text-sm text-muted-foreground">Sign-in activity for security auditing</p>
      </div>
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}
      <Card className="overflow-hidden">
        {loading ? <LoadingScreen /> : (
          <div className="p-4">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                      <TableCell className="font-medium">{l.username || `#${l.user_id}`}</TableCell>
                      <TableCell className="text-muted-foreground">{l.device_type || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{l.os_name || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.ip_address || '—'}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground" title={l.browser || ''}>{l.browser ? l.browser.replace(/Mozilla\/5\.0\s*/, '').slice(0, 60) : '—'}</TableCell>
                      <TableCell><Badge variant={l.was_successful ? 'ok' : 'destructive'}>{l.was_successful ? 'Success' : 'Failed'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No login records.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3">
              <PaginationNav page={page} totalPages={totalPages}
                onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)}
                showing={paged.length} total={rows.length}
              />
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
