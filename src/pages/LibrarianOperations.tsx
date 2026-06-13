import { useState, useMemo } from "react";
import {
  RefreshCcw, Wrench, Search, Settings, Zap, Activity,
  ArrowUpDown, Wifi, AlertTriangle, CheckCircle2, Coffee,
  QrCode, CircleDot
} from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { statusMeta } from "../lib/constants";
import { apiRequest } from "../api";
import { timeAgo } from "../lib/utils";
import { actionLabel } from "../lib/constants";
import type { DeskStatus, AppState } from "../types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const statusOrder: DeskStatus[] = ["free", "away", "occupied", "abandoned", "unavailable"];

function StatusDot({ status }: { status: DeskStatus }) {
  const colors: Record<DeskStatus, string> = {
    free:        "bg-emerald-500",
    occupied:    "bg-red-500",
    away:        "bg-amber-400",
    abandoned:   "bg-orange-500",
    unavailable: "bg-slate-300",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
}

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}

export function LibrarianOperations() {
  const { state, runAction, action } = useGlobalState();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeskStatus | "all">("all");

  if (!state) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const counts = {
    free:        state.desks.filter(d => d.status === "free").length,
    occupied:    state.desks.filter(d => d.status === "occupied").length,
    away:        state.desks.filter(d => d.status === "away").length,
    abandoned:   state.desks.filter(d => d.status === "abandoned").length,
    unavailable: state.desks.filter(d => d.status === "unavailable").length,
  };

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.desks
      .filter((desk) => {
        const queryMatch =
          !normalized ||
          desk.label.toLowerCase().includes(normalized) ||
          desk.code.toLowerCase().includes(normalized) ||
          desk.zone.toLowerCase().includes(normalized);
        const statusMatch = statusFilter === "all" || desk.status === statusFilter;
        return queryMatch && statusMatch;
      })
      .sort((a, b) => {
        const order: DeskStatus[] = ["abandoned", "away", "occupied", "free", "unavailable"];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
  }, [query, state.desks, statusFilter]);

  const recentLogs = [...(state.auditLogs ?? [])].slice(0, 8);

  const actionIcon: Record<string, React.ElementType> = {
    desk_claimed: CheckCircle2,
    desk_released_voluntarily: CheckCircle2,
    desk_auto_released: RefreshCcw,
    desk_marked_abandoned: AlertTriangle,
    desk_reset_by_librarian: RefreshCcw,
    desk_marked_away: Coffee,
    desk_marked_unavailable: Wrench,
    desk_resumed: Wifi,
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 page-fade-in">
        {/* Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard label="Free"        value={counts.free}        icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
          <SummaryCard label="Occupied"    value={counts.occupied}    icon={CircleDot}    color="bg-red-100 text-red-700" />
          <SummaryCard label="Away"        value={counts.away}        icon={Coffee}       color="bg-amber-100 text-amber-700" />
          <SummaryCard label="Abandoned"   value={counts.abandoned}   icon={AlertTriangle} color={counts.abandoned > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"} />
          <SummaryCard label="Unavailable" value={counts.unavailable} icon={Wrench}       color="bg-slate-100 text-slate-500" />
        </section>

        {/* Settings Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-600" />
                System Settings
              </CardTitle>
              <CardDescription className="mt-0.5">Configure Demo Mode and timing parameters.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Demo Mode</span>
              <Switch
                checked={state.config.demoMode}
                onCheckedChange={(val) =>
                  runAction("Updating settings", () =>
                    apiRequest("/api/librarian/config", {
                      method: "POST",
                      body: JSON.stringify({ demoMode: val }),
                    })
                  )
                }
              />
            </div>
          </CardHeader>

          {state.config.demoMode && (
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-sm font-semibold text-amber-700">Demo Mode active — reduced timers</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Occupied Session",    value: `${state.config.sessionSeconds / 60} min` },
                  { label: "Away Period",          value: `${state.config.awaySeconds}s` },
                  { label: "Confirmation Window",  value: `${state.config.warningSeconds}s` },
                  { label: "Abandoned Release",    value: `${state.config.abandonedReleaseSeconds}s` },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-amber-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Operations Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-indigo-600" />
                Desk Operations
              </CardTitle>
              <CardDescription className="mt-0.5">
                Reset desks, manage maintenance state. {rows.length} of {state.desks.length} shown.
              </CardDescription>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search desks..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val as DeskStatus | "all")}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOrder.map((item) => (
                    <SelectItem key={item} value={item}>{statusMeta[item].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="pl-6 w-[180px] text-xs font-semibold text-slate-500">Desk</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Location</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 hidden sm:table-cell">Features</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">Changed</TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((desk) => (
                    <TableRow key={desk.id} className="hover:bg-slate-50/50">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <StatusDot status={desk.status} />
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{desk.label}</div>
                            <div className="text-[11px] text-slate-400 uppercase tracking-wider">{desk.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        Floor {desk.floor} · {desk.zone}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusMeta[desk.status].badge} border text-xs font-medium`}>
                          {statusMeta[desk.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {desk.is_accessible && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-blue-600 border-blue-200 bg-blue-50">
                              ♿ Accessible
                            </Badge>
                          )}
                          {desk.features?.includes("power") && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-yellow-700 border-yellow-200 bg-yellow-50">
                              ⚡ Power
                            </Badge>
                          )}
                          {desk.features?.includes("silent") && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500 border-slate-200">
                              🔇 Silent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 tabular-nums">
                        {timeAgo(desk.status_changed_at)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                disabled={Boolean(action) || desk.status === "free"}
                                onClick={() =>
                                  void runAction("Desk reset", () =>
                                    apiRequest<AppState>(`/api/librarian/desks/${desk.id}/reset`, { method: "POST" })
                                  )
                                }
                              >
                                <RefreshCcw className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Force reset to free</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className={`h-7 w-7 ${desk.status === "unavailable" ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : ""}`}
                                disabled={Boolean(action)}
                                onClick={() =>
                                  void runAction(
                                    desk.status === "unavailable" ? "Desk restored" : "Desk unavailable",
                                    () =>
                                      apiRequest<AppState>(`/api/librarian/desks/${desk.id}/status`, {
                                        method: "PATCH",
                                        body: JSON.stringify({ status: desk.status === "unavailable" ? "free" : "unavailable" }),
                                      })
                                  )
                                }
                              >
                                <Wrench className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {desk.status === "unavailable" ? "Restore to service" : "Mark unavailable"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(`/app/map`, "_blank")}
                              >
                                <QrCode className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open QR display for desk</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Search className="h-8 w-8 opacity-40" />
                          <p className="text-sm font-medium">No desks found</p>
                          <p className="text-xs">Try adjusting your search or filter.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Live Audit Feed */}
        {recentLogs.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                Live Activity Feed
              </CardTitle>
              <CardDescription>Recent system events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLogs.map((log) => {
                  const desk = log.desk_id ? state.desks.find(d => d.id === log.desk_id) : null;
                  const IconEl = actionIcon[log.action] ?? Activity;
                  return (
                    <div key={log.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <IconEl className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{actionLabel(log.action)}</p>
                        {desk && <p className="text-xs text-slate-400">{desk.label} · {desk.zone}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">
                          {log.actor_role}
                        </Badge>
                        <span className="text-xs text-slate-400 tabular-nums">{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
