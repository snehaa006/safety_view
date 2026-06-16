import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { Zone } from '@/types';

export function WaterLevelChart({ zones }: { zones: Zone[] }) {
  const data = zones.map((z) => ({ name: `Z${z.zone_number}`, waterLevel: z.sensors.waterLevel }));

  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-semibold">Water Level by Zone</h3>
        <span className="text-xs text-muted-foreground">Tank / line fill percentage</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`${value}%`, 'Water Level']}
          />
          <Bar dataKey="waterLevel" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.waterLevel < 20 ? '#d97706' : '#2563eb'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function PressureChart({ zones }: { zones: Zone[] }) {
  const data = zones.map((z) => ({ name: `Z${z.zone_number}`, pressure: z.sensors.pressure }));

  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-semibold">Line Pressure by Zone</h3>
        <span className="text-xs text-muted-foreground">Bar — nominal range 2–8</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`${value} bar`, 'Pressure']}
          />
          <Bar dataKey="pressure" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.pressure < 2 || entry.pressure > 8 ? '#ea580c' : '#0ea5e9'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
