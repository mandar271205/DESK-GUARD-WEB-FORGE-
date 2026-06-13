import { useNavigate } from "react-router-dom";
import { Armchair, Users, AlertTriangle, Gauge, Map, Coffee, CheckCircle2 } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { MetricTile, CountdownRing } from "../components/shared/DashboardWidgets";
import { statusMeta } from "../lib/constants";
import { apiRequest } from "../api";
import type { DeskStatus, Desk } from "../types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function secondsUntil(iso: string | null | undefined, now: number) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
}

function statusCounts(desks: Desk[]) {
  const counts = { free: 0, occupied: 0, away: 0, abandoned: 0, unavailable: 0 };
  for (const desk of desks) counts[desk.status]++;
  return counts;
}

export function DashboardView() {
  const navigate = useNavigate();
  const { state, isStaff, now, runAction } = useGlobalState();

  if (!state) return null;

  const counts = statusCounts(state.desks);
  const activeDesk = state.activeSession ? state.desks.find((d) => d.id === state.activeSession?.desk_id) || null : null;
  const occupancyRate = state.desks.length > 0 ? Math.round(((counts.occupied + counts.away) / state.desks.length) * 100) : 0;
  
  const activeSession = state.activeSession;
  const deadline = activeSession?.status === "away" ? activeSession.away_expires_at : activeSession?.active_expires_at;
  const remaining = secondsUntil(deadline, now);
  const totalDuration = activeSession?.status === "away" ? state.config.awaySeconds : state.config.sessionSeconds;
  const showPresence = activeSession?.status === "active" && remaining <= state.config.warningSeconds;

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={Armchair} label="Free Desks" value={String(counts.free)} tone="primary" />
        <MetricTile icon={Users} label="Occupied" value={String(counts.occupied + counts.away)} tone="light" />
        <MetricTile icon={AlertTriangle} label="Abandoned" value={String(counts.abandoned)} tone={counts.abandoned > 0 ? "warning" : "light"} />
        <MetricTile icon={Gauge} label="Occupancy" value={`${occupancyRate}%`} tone="light" />
      </section>

      {/* Main Content Grid */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">{isStaff ? "Operational Overview" : "My Desk Status"}</CardTitle>
              <CardDescription>
                {isStaff ? "Library-wide desk status and events." : "Your current session and quick actions."}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/app/map")} className="hidden sm:flex">
              <Map className="mr-2 h-4 w-4" />
              Live Map
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {activeSession && activeDesk ? (
              <div className="grid gap-6 md:grid-cols-[1fr_200px] items-center rounded-xl border border-slate-100 bg-slate-50/50 p-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">Active Session</Badge>
                    <Badge className={`${statusMeta[activeDesk.status].badge} border-transparent`}>{statusMeta[activeDesk.status].label}</Badge>
                  </div>
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 mt-2">{activeDesk.label}</h3>
                  <p className="text-slate-500 font-medium mt-1">
                    {activeDesk.zone} • Floor {activeDesk.floor}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {activeSession.status === "active" ? (
                      <>
                        {showPresence ? (
                          <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={() => void runAction("Presence confirmed", () =>
                              apiRequest(`/api/sessions/${activeSession.id}/confirm-presence`, { method: "POST" })
                            )}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirm Presence
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                          onClick={() => void runAction("Stepping away", () => apiRequest("/api/claim/away", { method: "POST" }))}
                        >
                          <Coffee className="mr-2 h-4 w-4" />
                          Step away
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-slate-50 hover:bg-rose-50 hover:text-rose-700 border-slate-200"
                          onClick={() => void runAction("Releasing desk", () => apiRequest("/api/claim/release", { method: "POST" }))}
                        >
                          Release desk
                        </Button>
                      </>
                    ) : activeSession.status === "away" ? (
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => void runAction("Resuming", () => apiRequest("/api/claim/resume", { method: "POST" }))}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        I'm back
                      </Button>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex justify-center border-t border-slate-200 pt-6 md:border-t-0 md:border-l md:pt-0">
                  <CountdownRing seconds={remaining} total={totalDuration} large />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <Armchair className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900">No active session</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  You haven't claimed a desk yet. Scan a QR code at any available desk or browse the live map.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button onClick={() => navigate("/claim")} className="bg-indigo-600 hover:bg-indigo-700">
                    Claim Desk
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/app/map")}>
                    View Map
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel: Quick Actions or Profile Summary */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Citizenship Score</CardTitle>
            <CardDescription>Your library standing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-6 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-4xl font-extrabold text-emerald-600">100</span>
              <span className="text-sm font-medium text-emerald-700 mt-2">Excellent</span>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Attendance reliability</span>
                  <span className="font-medium text-slate-900">98%</span>
                </div>
                <Progress value={98} className="h-2 bg-slate-100" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">On-time returns</span>
                  <span className="font-medium text-slate-900">100%</span>
                </div>
                <Progress value={100} className="h-2 bg-slate-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
