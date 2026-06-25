import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart2, FileText, RefreshCw, Search } from 'lucide-react';
import { fetchAllPanels, fetchAlarmReportData } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingScreen } from '@/components/ui/spinner';
import { formatDateTime, zoneStateMeta } from '@/utils/format';
import type { Panel, AlarmReportRow } from '@/types';

function toDateTimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function StateBadge({ state }: { state: string }) {
  const m = zoneStateMeta(state as any);
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.badge}`}>{m.label}</span>;
}

interface ReportTypeOption {
  id: 'alarm' | 'offline';
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}
const REPORT_TYPES: ReportTypeOption[] = [
  { id: 'alarm', label: 'Alarm Report', icon: FileBarChart2 },
  { id: 'offline', label: 'Site Offline Status', icon: FileText, disabled: true },
];

export default function ReportsPage() {
  const { user } = useAuth();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [reportType, setReportType] = useState<'alarm' | 'offline'>('alarm');
  const [startDate, setStartDate] = useState(toDateTimeLocal(weekAgo));
  const [endDate, setEndDate] = useState(toDateTimeLocal(now));

  const [allPanels, setAllPanels] = useState<Panel[]>([]);
  const [panelsLoading, setPanelsLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [panelSearch, setPanelSearch] = useState('');

  const [reportData, setReportData] = useState<AlarmReportRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllPanels().then(setAllPanels).finally(() => setPanelsLoading(false));
  }, []);

  const filteredPanels = useMemo(() => {
    const q = panelSearch.trim().toLowerCase();
    if (!q) return allPanels;
    return allPanels.filter((p) => {
      const name = (p.panel_name || p.panel_code).toLowerCase();
      const bld = (p.building_name ?? '').toLowerCase();
      return name.includes(q) || bld.includes(q) || p.panel_code.toLowerCase().includes(q);
    });
  }, [allPanels, panelSearch]);

  function togglePanel(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSelectAll(checked: boolean) {
    setSelectAll(checked);
    if (checked) setSelectedIds([]);
  }

  async function generateReport() {
    setError('');
    if (!selectAll && selectedIds.length === 0) {
      setError('Please select at least one panel.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select a date range.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date.');
      return;
    }
    try {
      setGenerating(true);
      const panelIds = selectAll ? null : selectedIds;
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate).toISOString();
      const data = await fetchAlarmReportData(panelIds, start, end);
      setReportData(data);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  function downloadCSV() {
    const headers = ['S No', 'Building', 'Panel Code', 'Panel Name', 'Zone', 'Previous State', 'New State', 'Date & Time'];
    const rows = reportData.map((r) => [
      r.s_no,
      r.building_name ?? '',
      r.panel_code,
      r.panel_name,
      r.zone_name,
      r.previous_state,
      r.new_state,
      r.created_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alarm-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const dateLabel = `${startDate.replace('T', ' ')} to ${endDate.replace('T', ' ')}`;
    const panelLabel = selectAll
      ? 'All Panels'
      : allPanels.filter((p) => selectedIds.includes(p.id)).map((p) => p.panel_name || p.panel_code).join(', ');
    const generatedOn = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const generatedBy = user?.username ?? '—';

    const rows = reportData
      .map(
        (r) => `
        <tr>
          <td>${r.s_no}</td>
          <td>${r.building_name ?? '—'}</td>
          <td>${r.panel_name}<br/><span class="code">${r.panel_code}</span></td>
          <td>${r.zone_name}</td>
          <td class="state ${r.previous_state.toLowerCase()}">${r.previous_state}</td>
          <td class="state ${r.new_state.toLowerCase()}">${r.new_state}</td>
          <td>${new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Alarm Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
    .meta { margin-bottom: 12px; font-size: 11px; color: #555; }
    .meta p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: top; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .code { font-family: monospace; font-size: 10px; color: #666; }
    .state { font-weight: bold; text-align: center; }
    .healthy { background: #d1fae5; color: #065f46; }
    .fire { background: #fee2e2; color: #991b1b; }
    .fault { background: #fef3c7; color: #92400e; }
    .isolation { background: #e5e7eb; color: #374151; }
    .header-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .header-left { font-size: 11px; }
    @media print { @page { margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="header-left">
      <p>Date: ${generatedOn}</p>
      <p>Report Generated By: ${generatedBy}</p>
    </div>
  </div>
  <h1>Alarm Report</h1>
  <div class="meta">
    <p><strong>Date Range:</strong> ${dateLabel}</p>
    <p><strong>Panels:</strong> ${panelLabel}</p>
    <p><strong>Total Records:</strong> ${reportData.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>S No</th>
        <th>Building</th>
        <th>Panel</th>
        <th>Zone</th>
        <th>Previous State</th>
        <th>New State</th>
        <th>Date &amp; Time</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#999;">No records found.</td></tr>'}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  if (panelsLoading) return <LoadingScreen />;

  const selectedPanelCount = selectAll ? allPanels.length : selectedIds.length;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Reports</h3>
        <p className="text-sm text-muted-foreground">Generate and download alarm and status reports</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Filters */}
        <Card className="p-5 space-y-5 lg:col-span-1">
          {/* Report type */}
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report Type</Label>
            <div className="flex flex-col gap-2">
              {REPORT_TYPES.map((rt) => {
                const Icon = rt.icon;
                const isSelected = reportType === rt.id;
                return (
                  <button
                    key={rt.id}
                    disabled={rt.disabled}
                    onClick={() => !rt.disabled && setReportType(rt.id as any)}
                    className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                      rt.disabled
                        ? 'cursor-not-allowed border-border bg-muted/30 text-muted-foreground'
                        : isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{rt.label}</span>
                    {rt.disabled && (
                      <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Range</Label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Start</Label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">End</Label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Panel picker */}
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Panels</Label>
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={selectAll}
                onCheckedChange={(v) => handleSelectAll(v === true)}
              />
              All Panels ({allPanels.length})
            </label>

            {!selectAll && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={panelSearch}
                    onChange={(e) => setPanelSearch(e.target.value)}
                    placeholder="Search panels…"
                    className="flex h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-background p-2 space-y-1">
                  {filteredPanels.length === 0 && (
                    <p className="py-2 text-center text-xs text-muted-foreground">No panels found.</p>
                  )}
                  {filteredPanels.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-start gap-2 rounded p-1 text-sm hover:bg-muted/60">
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => togglePanel(p.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <span>
                        <span className="font-medium">{p.panel_name || p.panel_code}</span>
                        {p.building_name && (
                          <span className="ml-1 text-xs text-muted-foreground">· {p.building_name}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{selectedIds.length} of {allPanels.length} selected</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-crit-border bg-crit-bg px-3 py-2 text-sm text-crit-text">{error}</div>
          )}

          <Button onClick={generateReport} disabled={generating} className="w-full">
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Generate Report'}
          </Button>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          {!generated && !generating && (
            <Card className="flex min-h-64 items-center justify-center p-8 text-center">
              <div>
                <FileBarChart2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Configure the filters and click <strong>Generate Report</strong> to see results.</p>
              </div>
            </Card>
          )}

          {generating && (
            <Card className="flex min-h-64 items-center justify-center p-8">
              <div className="text-center">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fetching data…</p>
              </div>
            </Card>
          )}

          {generated && !generating && (
            <Card className="overflow-hidden">
              {/* Results header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="font-semibold">Alarm Report</p>
                  <p className="text-xs text-muted-foreground">
                    {startDate.replace('T', ' ')} → {endDate.replace('T', ' ')} · {selectedPanelCount} panel{selectedPanelCount !== 1 ? 's' : ''} · <strong>{reportData.length}</strong> records
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadCSV} disabled={reportData.length === 0}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadPDF}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>

              {reportData.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No zone events found for the selected filters.
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-secondary">
                      <tr className="border-b border-border [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                        <th>S No</th>
                        <th>Building</th>
                        <th>Panel</th>
                        <th>Zone</th>
                        <th>Previous State</th>
                        <th>New State</th>
                        <th>Date &amp; Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, i) => (
                        <tr
                          key={row.s_no}
                          className={`border-b border-border [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2 ${i % 2 ? 'bg-muted/20' : ''}`}
                        >
                          <td className="text-muted-foreground">{row.s_no}</td>
                          <td className="text-muted-foreground">{row.building_name ?? '—'}</td>
                          <td>
                            <span className="font-medium">{row.panel_name}</span>
                            <br />
                            <span className="font-mono text-xs text-muted-foreground">{row.panel_code}</span>
                          </td>
                          <td>{row.zone_name}</td>
                          <td><StateBadge state={row.previous_state} /></td>
                          <td><StateBadge state={row.new_state} /></td>
                          <td className="text-muted-foreground">{formatDateTime(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
