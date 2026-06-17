import { useEffect, useState } from 'react';
import { fetchAuditLog } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AuditLogEntry } from '@/types';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setRows(await fetchAuditLog());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Audit Log</h3>
        <p className="text-sm text-muted-foreground">Who did what, when</p>
      </div>

      {error && (
        <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">
          {error}
          <div className="mt-1 text-xs text-muted-foreground">
            The audit_log table is RLS-locked. To view it here, add a SELECT policy for the anon key, or proxy
            this through a backend with the service-role key.
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>By (user id)</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(r.created_at)}</TableCell>
                    <TableCell><Badge variant="water">{r.action.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{r.performed_by ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{(r.user_role || '—').replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.target_table ? `${r.target_table}#${r.target_id ?? ''}` : '—'}
                    </TableCell>
                    <TableCell>{r.description || '—'}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && !error && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No audit entries.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
