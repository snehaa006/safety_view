import { useEffect, useState } from 'react';
import { fetchAuditLog } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/utils/format';
import type { AuditLogEntry } from '@/types';

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { setRows(await fetchAuditLog()); }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load audit log'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Audit Log</h3>
        <p className="text-sm text-muted-foreground">Admin/system actions — who did what, when</p>
      </div>
      {error && (
        <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">
          {error}
          <div className="mt-1 text-xs text-muted-foreground">audit_log is RLS-locked; needs the get_audit_log RPC.</div>
        </div>
      )}
      <Card className="overflow-hidden">
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>By</TableHead>
                  <TableHead>Entity</TableHead><TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell><Badge variant="water">{r.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{r.username || (r.user_id != null ? `#${r.user_id}` : '—')}</TableCell>
                    <TableCell className="text-muted-foreground">{r.entity_type ? `${r.entity_type}${r.entity_id != null ? `#${r.entity_id}` : ''}` : '—'}</TableCell>
                    <TableCell>{r.description || '—'}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && !error && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No audit entries.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
