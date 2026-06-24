import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Cpu, Flame, AlertTriangle } from 'lucide-react';
import { fetchBuildings, summariseBuildings } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Building } from '@/types';

interface MetricCardProps {
  label: string;
  value: number;
  icon: typeof Cpu;
  tone: string;
  iconBg: string;
  description: string;
  onClick: () => void;
}

function MetricCard({ label, value, icon: Icon, tone, iconBg, description, onClick }: MetricCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'flex cursor-pointer flex-col gap-3 border-l-4 p-5 transition-transform hover:-translate-y-0.5 hover:shadow-md',
        tone
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </Card>
  );
}

export default function BuildingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchBuildings(user);
        if (mounted) setBuildings(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const scope = useMemo(() => summariseBuildings(buildings), [buildings]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (error) return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">Select a category to explore your fire safety data</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Buildings"
          value={scope.buildings}
          icon={Building2}
          tone="border-l-water-strong"
          iconBg="bg-water-bg text-water-strong"
          description="View all buildings in scope"
          onClick={() => navigate('/all-buildings')}
        />
        <MetricCard
          label="Panels"
          value={scope.panels}
          icon={Cpu}
          tone="border-l-water-strong"
          iconBg="bg-water-bg text-water-strong"
          description="View all fire alarm panels"
          onClick={() => navigate('/all-panels')}
        />
        <MetricCard
          label="Fire Zones"
          value={scope.fire}
          icon={Flame}
          tone="border-l-crit-strong"
          iconBg="bg-crit-bg text-crit-strong"
          description="View all zones with active fire"
          onClick={() => navigate('/fire-zones')}
        />
        <MetricCard
          label="Fault Zones"
          value={scope.fault}
          icon={AlertTriangle}
          tone="border-l-warn-strong"
          iconBg="bg-warn-bg text-warn-strong"
          description="View all zones with fault"
          onClick={() => navigate('/fault-zones')}
        />
      </div>
    </section>
  );
}
