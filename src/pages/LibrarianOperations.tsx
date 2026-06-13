import { useState, useMemo } from "react";
import { RefreshCcw, Wrench, Search, ShieldCheck, Settings, Play } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { statusMeta } from "../lib/constants";
import { apiRequest } from "../api";
import { timeAgo } from "../lib/utils";
import type { DeskStatus, AppState } from "../types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

const statusOrder: DeskStatus[] = ["free", "away", "occupied", "abandoned", "unavailable"];

export function LibrarianOperations() {
  const { state, runAction, action } = useGlobalState();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeskStatus | "all">("all");

  if (!state) return null;

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.desks.filter((desk) => {
      const queryMatch =
        !normalized ||
        desk.label.toLowerCase().includes(normalized) ||
        desk.code.toLowerCase().includes(normalized) ||
        desk.zone.toLowerCase().includes(normalized);
      const statusMatch = statusFilter === "all" || desk.status === statusFilter;
      return queryMatch && statusMatch;
    });
  }, [query, state.desks, statusFilter]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              System Settings
            </CardTitle>
            <CardDescription>Configure Demo Mode and timers.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Demo Mode</span>
            <Switch 
              checked={state.config.demoMode}
              onCheckedChange={(val) => 
                runAction("Updating settings", () => 
                  apiRequest("/api/librarian/config", {
                    method: "POST",
                    body: JSON.stringify({ demoMode: val })
                  })
                )
              }
            />
          </div>
        </CardHeader>
        {state.config.demoMode && (
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Occupied Session</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{state.config.sessionSeconds / 60} minutes</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Away Period</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{state.config.awaySeconds} seconds</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Confirmation Window</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{state.config.warningSeconds} seconds</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Abandoned Release</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{state.config.abandonedReleaseSeconds} seconds</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <CardTitle className="text-xl">Desk Operations</CardTitle>
            <CardDescription>Reset desks and manage maintenance state.</CardDescription>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search desks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val as DeskStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
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
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[200px] pl-6">Desk</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Changed</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((desk) => (
                <TableRow key={desk.id}>
                  <TableCell className="pl-6">
                    <div className="font-semibold text-slate-900">{desk.label}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">{desk.code}</div>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                    Floor {desk.floor} • {desk.zone}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusMeta[desk.status].bg} ${statusMeta[desk.status].text} border-${statusMeta[desk.status].stroke}`}>
                      {statusMeta[desk.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {timeAgo(desk.status_changed_at)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Force Reset Desk"
                        disabled={Boolean(action) || desk.status === "free"}
                        onClick={() =>
                          void runAction("Desk reset", () =>
                            apiRequest<AppState>(`/api/librarian/desks/${desk.id}/reset`, { method: "POST" })
                          )
                        }
                      >
                        <RefreshCcw className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={desk.status === "unavailable" ? "Restore desk" : "Mark unavailable"}
                        disabled={Boolean(action)}
                        className={desk.status === "unavailable" ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : ""}
                        onClick={() =>
                          void runAction(desk.status === "unavailable" ? "Desk restored" : "Desk unavailable", () =>
                            apiRequest<AppState>(`/api/librarian/desks/${desk.id}/status`, {
                              method: "PATCH",
                              body: JSON.stringify({ status: desk.status === "unavailable" ? "free" : "unavailable" })
                            })
                          )
                        }
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No desks found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
