import { ReactNode } from "react";
import { Gauge, AlertTriangle, DoorOpen } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { statusMeta, actionLabel } from "../lib/constants";
import { MetricTile } from "../components/shared/DashboardWidgets";
import type { DeskStatus, Desk } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusOrder: DeskStatus[] = ["free", "away", "occupied", "abandoned", "unavailable"];

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function statusCounts(desks: Desk[]) {
  const counts = { free: 0, occupied: 0, away: 0, abandoned: 0, unavailable: 0 };
  for (const desk of desks) counts[desk.status]++;
  return counts;
}

export function LibrarianAnalytics() {
  const { state } = useGlobalState();

  if (!state) return null;

  const counts = statusCounts(state.desks);
  const occupancyRate = state.desks.length > 0 ? Math.round(((counts.occupied + counts.away) / state.desks.length) * 100) : 0;

  const statusData = statusOrder.map((status) => ({
    name: statusMeta[status].label,
    value: counts[status],
    color: statusMeta[status].fill || "#94a3b8" // Fallback color
  }));

  const zoneData = Array.from(new Set(state.desks.map((desk) => desk.zone))).map((zone) => {
    const desks = state.desks.filter((desk) => desk.zone === zone);
    return {
      zone,
      free: desks.filter((desk) => desk.status === "free").length,
      occupied: desks.filter((desk) => desk.status === "occupied" || desk.status === "away").length,
      unavailable: desks.filter((desk) => desk.status === "unavailable").length
    };
  });

  const auditTrend = [...state.auditLogs]
    .reverse()
    .slice(-12)
    .map((log, index) => ({
      name: `${index + 1}`,
      events: index + 1,
      action: actionLabel(log.action)
    }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricTile icon={Gauge} label="Occupancy Rate" value={`${occupancyRate}%`} tone="light" />
        <MetricTile icon={AlertTriangle} label="Abandonments" value={String(counts.abandoned)} tone={counts.abandoned > 0 ? "warning" : "light"} />
        <MetricTile icon={DoorOpen} label="Free Desks" value={String(counts.free)} tone="primary" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Desk Status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Zone Utilization">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="zone" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="free" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="occupied" stackId="a" fill="#ef4444" />
              <Bar dataKey="unavailable" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Activity Momentum">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={auditTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Release Types Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {["desk_released_voluntarily", "desk_auto_released", "desk_reset_by_librarian", "desk_marked_abandoned"].map(
                (action) => {
                  const count = state.auditLogs.filter((log) => log.action === action).length;
                  return (
                    <div key={action} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <span className="text-sm font-medium text-slate-700">{actionLabel(action)}</span>
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
