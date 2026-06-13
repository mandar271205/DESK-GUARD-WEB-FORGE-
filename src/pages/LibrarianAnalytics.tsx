import { ReactNode } from "react";
import { BarChart3, Gauge, AlertTriangle, DoorOpen, TrendingUp, Download } from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { statusMeta, actionLabel } from "../lib/constants";
import type { DeskStatus, Desk } from "../types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusOrder: DeskStatus[] = ["free", "away", "occupied", "abandoned", "unavailable"];

const ZONE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function ChartPanel({ title, description, children, action }: {
  title: string; description?: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <Badge variant="outline" className="text-xs font-bold text-slate-700 border-slate-200">{value}</Badge>
    </div>
  );
}

function statusCounts(desks: Desk[]) {
  const counts = { free: 0, occupied: 0, away: 0, abandoned: 0, unavailable: 0 };
  for (const desk of desks) counts[desk.status]++;
  return counts;
}

function exportCsv(data: Record<string, string | number>[]) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(","), ...data.map(row => headers.map(h => row[h]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deskguard-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LibrarianAnalytics() {
  const { state } = useGlobalState();

  if (!state) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const counts = statusCounts(state.desks);
  const occupancyRate =
    state.desks.length > 0
      ? Math.round(((counts.occupied + counts.away) / state.desks.length) * 100)
      : 0;

  const statusData = statusOrder.map((status) => ({
    name: statusMeta[status].label,
    value: counts[status],
    color: statusMeta[status].fill || "#94a3b8",
  })).filter(d => d.value > 0);

  const zoneData = Array.from(new Set(state.desks.map((desk) => desk.zone))).map((zone) => {
    const desks = state.desks.filter((desk) => desk.zone === zone);
    return {
      zone: zone.length > 14 ? zone.slice(0, 12) + "…" : zone,
      Free:       desks.filter((d) => d.status === "free").length,
      Occupied:   desks.filter((d) => d.status === "occupied" || d.status === "away").length,
      Unavailable: desks.filter((d) => d.status === "unavailable").length,
    };
  });

  const auditTrend = [...state.auditLogs]
    .reverse()
    .slice(-16)
    .map((log, index) => ({
      name: `#${index + 1}`,
      events: index + 1,
      action: actionLabel(log.action),
    }));

  const releaseTypes = [
    { label: "Voluntary Release",    action: "desk_released_voluntarily", color: "bg-emerald-400" },
    { label: "Auto Released",        action: "desk_auto_released",         color: "bg-amber-400" },
    { label: "Librarian Reset",      action: "desk_reset_by_librarian",    color: "bg-indigo-400" },
    { label: "Abandoned",            action: "desk_marked_abandoned",      color: "bg-orange-400" },
  ].map(item => ({
    ...item,
    count: state.auditLogs.filter(l => l.action === item.action).length,
  }));

  const csvData = state.desks.map(d => ({
    label:  d.label,
    code:   d.code,
    floor:  d.floor,
    zone:   d.zone,
    status: d.status,
    accessible: d.is_accessible ? "yes" : "no",
    changed: d.status_changed_at,
  }));

  return (
    <div className="space-y-6 page-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Live occupancy and trend data.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(csvData)}
          className="text-slate-600"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* KPI Row */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Gauge,         label: "Occupancy Rate", value: `${occupancyRate}%`,          color: "bg-indigo-100 text-indigo-700" },
          { icon: AlertTriangle, label: "Abandonments",   value: String(counts.abandoned),     color: counts.abandoned > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500" },
          { icon: DoorOpen,      label: "Free Desks",     value: String(counts.free),           color: "bg-emerald-100 text-emerald-700" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</span>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Charts grid */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Desk Status Donut */}
        <ChartPanel title="Desk Status" description="Current desk breakdown by status">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {statusData.map(item => (
                <StatRow
                  key={item.name}
                  label={item.name}
                  value={String(item.value)}
                  color=""
                />
              ))}
            </div>
          </div>
        </ChartPanel>

        {/* Zone Utilization */}
        <ChartPanel title="Zone Utilization" description="Free vs occupied by zone">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={zoneData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="zone" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 13 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Free"        stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Occupied"    stackId="a" fill="#ef4444" />
              <Bar dataKey="Unavailable" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Activity Momentum */}
        <ChartPanel title="Activity Momentum" description="Recent audit event trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={auditTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 13 }}
                labelFormatter={(v) => `Event ${v}`}
              />
              <Area type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEvents)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Release Breakdown */}
        <ChartPanel title="Release Types" description="How desks were freed">
          <div className="space-y-2 pt-2">
            {releaseTypes.map((item) => (
              <div key={item.action}>
                <div className="flex justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
                    <span className="text-slate-700 font-medium">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div
                    className={`h-1.5 rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, (item.count / Math.max(1, state.auditLogs.length)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {state.config.demoMode && (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 p-3">
              <TrendingUp className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Showing live data. Demo Mode active — sessions complete faster than production.
              </p>
            </div>
          )}
        </ChartPanel>
      </section>
    </div>
  );
}
