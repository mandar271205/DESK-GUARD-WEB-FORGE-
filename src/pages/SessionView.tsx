import { useNavigate } from "react-router-dom";
import { Clock3, ShieldCheck, RefreshCcw, CheckCircle2, Coffee, Play, DoorOpen, ScanLine, Map, Circle, Armchair, AlertTriangle } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { MetricTile, CountdownRing, formatDuration } from "../components/shared/DashboardWidgets";
import { statusMeta } from "../lib/constants";
import { apiRequest } from "../api";
import { timeAgo } from "../lib/utils";
import type { AppState } from "../types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function secondsUntil(iso: string | null | undefined, now: number) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
}

export function SessionView() {
  const navigate = useNavigate();
  const { state, now, runAction, action } = useGlobalState();

  if (!state) return null;

  const session = state.activeSession;
  const desk = session ? state.desks.find((d) => d.id === session.desk_id) : null;

  if (!session || !desk) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-6">
          <Armchair className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">No active session</h2>
        <p className="mt-2 text-slate-500 max-w-sm text-center">
          You haven't claimed a desk yet. Scan a QR code at any available desk to start a session.
        </p>
        <Button onClick={() => navigate("/app/map")} className="mt-8 bg-indigo-600 hover:bg-indigo-700" size="lg">
          <Map className="mr-2 h-5 w-5" />
          Browse Live Map
        </Button>
      </div>
    );
  }

  const deadline = session.status === "away" ? session.away_expires_at : session.active_expires_at;
  const remaining = secondsUntil(deadline, now);
  const total = session.status === "away" ? state.config.awaySeconds : state.config.sessionSeconds;
  const showPresence = session.status === "active" && remaining <= state.config.warningSeconds;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Session</CardDescription>
              <CardTitle className="text-4xl font-extrabold text-slate-900 mt-1">{desk.label}</CardTitle>
              <p className="mt-2 text-slate-600 font-medium">
                {desk.zone} • Floor {desk.floor} • Started {timeAgo(session.started_at)}
              </p>
            </div>
            <Badge className={`${statusMeta[desk.status].bg} ${statusMeta[desk.status].text} border-${statusMeta[desk.status].stroke} px-3 py-1 text-sm`}>
              {statusMeta[desk.status].label}
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile icon={Clock3} label={session.status === "away" ? "Away Expires" : "Session Expires"} value={formatDuration(remaining)} tone="light" />
              <MetricTile icon={ShieldCheck} label="Citizen Score" value={String(state.profile.citizenship_score)} tone="primary" />
              <MetricTile icon={RefreshCcw} label="Sweep Interval" value={`${state.config.sweepSeconds}s`} tone="light" />
            </div>

            {showPresence && (
              <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertTitle className="font-bold">Presence Check Required</AlertTitle>
                <AlertDescription className="mt-2 flex items-center justify-between">
                  <span>This session is inside the confirmation window. Confirm you are still here.</span>
                  <Button
                    onClick={() =>
                      void runAction("Presence confirmed", () =>
                        apiRequest<AppState>(`/api/sessions/${session.id}/confirm-presence`, { method: "POST" })
                      )
                    }
                    disabled={Boolean(action)}
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm ml-4 shrink-0"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    I'm still here
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-slate-100">
              {session.status === "active" && (
                <Button
                  onClick={() =>
                    void runAction("Away Mode started", () =>
                      apiRequest<AppState>(`/api/sessions/${session.id}/away`, { method: "POST" })
                    )
                  }
                  disabled={Boolean(action)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  size="lg"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  Take a break
                </Button>
              )}
              {session.status === "away" && (
                <Button
                  onClick={() =>
                    void runAction("Session resumed", () =>
                      apiRequest<AppState>(`/api/sessions/${session.id}/resume`, { method: "POST" })
                    )
                  }
                  disabled={Boolean(action)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Resume Session
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  void runAction("Desk released", () =>
                    apiRequest<AppState>(`/api/sessions/${session.id}/release`, { method: "POST" })
                  )
                }
                disabled={Boolean(action)}
                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                size="lg"
              >
                <DoorOpen className="mr-2 h-5 w-5" />
                Release Desk
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <div className="bg-slate-50 py-8 border-b border-slate-100 flex justify-center">
            <CountdownRing seconds={remaining} total={total} large />
          </div>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <ScanLine className="h-5 w-5 text-indigo-500" />
              <span className="font-semibold text-slate-700">{desk.code}</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <Map className="h-5 w-5 text-indigo-500" />
              <span className="font-medium text-slate-700">{desk.zone}, floor {desk.floor}</span>
            </div>
            {desk.features.map((feature) => (
              <div key={feature} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
                <Circle className="h-5 w-5 fill-slate-200 text-slate-200" />
                <span className="font-medium text-slate-700">{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
