import {
  Activity, RefreshCcw, CheckCircle2, AlertTriangle, Coffee, Wifi,
  Wrench, LogIn, QrCode, Download, User
} from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { actionLabel } from "../lib/constants";
import { timeAgo } from "../lib/utils";
import type { AuditLog } from "../types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const actionConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  desk_claimed:               { icon: LogIn,         color: "text-emerald-600", bg: "bg-emerald-50" },
  desk_released_voluntarily:  { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
  desk_auto_released:         { icon: RefreshCcw,    color: "text-amber-600",   bg: "bg-amber-50" },
  desk_marked_abandoned:      { icon: AlertTriangle, color: "text-orange-600",  bg: "bg-orange-50" },
  desk_reset_by_librarian:    { icon: Wrench,        color: "text-indigo-600",  bg: "bg-indigo-50" },
  desk_marked_away:           { icon: Coffee,        color: "text-amber-600",   bg: "bg-amber-50" },
  desk_resumed:               { icon: Wifi,          color: "text-blue-600",    bg: "bg-blue-50" },
  desk_marked_unavailable:    { icon: Wrench,        color: "text-slate-600",   bg: "bg-slate-100" },
  qr_issued:                  { icon: QrCode,        color: "text-violet-600",  bg: "bg-violet-50" },
};

function getConfig(action: string) {
  return actionConfig[action] ?? { icon: Activity, color: "text-slate-500", bg: "bg-slate-100" };
}

function exportLogsCSV(logs: AuditLog[]) {
  const rows = logs.map(log => ({
    id:         log.id,
    action:     log.action,
    actor_role: log.actor_role,
    desk_id:    log.desk_id ?? "",
    created_at: log.created_at,
  }));
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => r[h as keyof typeof r]).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deskguard-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LibrarianAudit() {
  const { state } = useGlobalState();

  if (!state) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {state.auditLogs.length} system events recorded.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportLogsCSV(state.auditLogs)}
          disabled={state.auditLogs.length === 0}
          className="text-slate-600"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base">Event Timeline</CardTitle>
          <CardDescription>System events, desk operations, and session actions — newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {state.auditLogs.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {state.auditLogs.map((log, idx) => {
                const desk = log.desk_id ? state.desks.find((d) => d.id === log.desk_id) : null;
                const cfg = getConfig(log.action);
                const IconEl = cfg.icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                      <IconEl className={`h-4 w-4 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {actionLabel(log.action)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider border-slate-200 text-slate-500"
                        >
                          <User className="h-2.5 w-2.5 mr-1" />
                          {log.actor_role}
                        </Badge>
                      </div>
                      {desk ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-600">{desk.label}</span>
                          {" · "}{desk.zone}{" · "}Floor {desk.floor}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">System event</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-slate-400 tabular-nums">{timeAgo(log.created_at)}</span>
                      <p className="text-[10px] text-slate-300 mt-0.5">#{state.auditLogs.length - idx}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <Activity className="h-6 w-6 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No Logs Yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Audit events appear here as desk sessions begin, end, and change state.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
