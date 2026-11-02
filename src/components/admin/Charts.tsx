'use client';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from 'recharts';

const BLUE = '#1D4ED8';
const GREEN = '#059669';

export function RevenueChart({ data }: { data: { day: string; revenue: number; sales: number }[] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted">No data in this range.</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="rev" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} width={70} />
          <YAxis yAxisId="n" orientation="right" allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
          <Tooltip formatter={(v, name) => (name === 'Revenue' ? `₹${Number(v).toLocaleString('en-IN')}` : v)} />
          <Legend />
          <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill={BLUE} radius={[4, 4, 0, 0]} />
          <Line yAxisId="n" dataKey="sales" name="Sales" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBars({ data, color = BLUE, height = 220 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted">No data in this range.</p>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
