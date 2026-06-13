import { Activity } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { actionLabel } from "../lib/constants";
import { timeAgo } from "../lib/utils";
import type { AuditLog, Desk } from "../types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LibrarianAudit() {
  const { state } = useGlobalState();

  if (!state) return null;

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl">Audit Logs</CardTitle>
        <CardDescription>System events, abandonments, and operations log.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.auditLogs.length > 0 ? (
          <div className="space-y-4">
            {state.auditLogs.map((log) => {
              const desk = log.desk_id ? state.desks.find((d) => d.id === log.desk_id) : null;
              return (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{actionLabel(log.action)}</h4>
                      <Badge variant="outline" className="text-xs uppercase tracking-wider text-slate-500 bg-white">
                        {log.actor_role}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {desk ? (
                        <span className="font-medium text-slate-700">{desk.label} • {desk.zone}</span>
                      ) : (
                        "System event"
                      )}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-slate-400 whitespace-nowrap">
                    {timeAgo(log.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
            <Activity className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No Logs Available</h3>
            <p className="text-sm text-slate-500 mt-1">Audit events will appear here once activity occurs.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
