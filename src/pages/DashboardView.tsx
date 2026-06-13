import { useNavigate } from "react-router-dom";
import {
  Armchair, Users, AlertTriangle, Gauge, Map, Coffee,
  CheckCircle2, Star, TrendingUp, Clock, ArrowRight, Zap
} from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { CountdownRing } from "../components/shared/DashboardWidgets";
import { statusMeta } from "../lib/constants";
import { apiRequest } from "../api";
import { timeAgo } from "../lib/utils";
import type { Desk } from "../types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

function secondsUntil(iso: string | null | undefined, now: number) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
}

function statusCounts(desks: Desk[]) {
  const counts = { free: 0, occupied: 0, away: 0, abandoned: 0, unavailable: 0 };
  for (const desk of desks) counts[desk.status]++;
  return counts;
}

function getBadgeInfo(score: number) {
  if (score >= 90) return { label: "Gold", color: "text-yellow-600 bg-yellow-50 border-yellow-200", star: "⭐" };
  if (score >= 70) return { label: "Silver", color: "text-slate-600 bg-slate-100 border-slate-300", star: "🥈" };
  if (score >= 50) return { label: "Bronze", color: "text-orange-600 bg-orange-50 border-orange-200", star: "🥉" };
  return { label: "Needs Improvement", color: "text-red-600 bg-red-50 border-red-200", star: "🔴" };
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm card-lift">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const navigate = useNavigate();
  const { state, isStaff, now, runAction } = useGlobalState();

  if (!state) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  const counts = statusCounts(state.desks);
  const activeDesk = state.activeSession
    ? state.desks.find((d) => d.id === state.activeSession?.desk_id) || null
    : null;
  const occupancyRate =
    state.desks.length > 0
      ? Math.round(((counts.occupied + counts.away) / state.desks.length) * 100)
      : 0;

  const activeSession = state.activeSession;
  const deadline =
    activeSession?.status === "away"
      ? activeSession.away_expires_at
      : activeSession?.active_expires_at;
  const remaining = secondsUntil(deadline, now);
  const totalDuration =
    activeSession?.status === "away"
      ? state.config.awaySeconds
      : state.config.sessionSeconds;
  const showPresence =
    activeSession?.status === "active" && remaining <= state.config.warningSeconds;

  const score = state.profile?.citizenship_score ?? 100;
  const badge = getBadgeInfo(score);

  const firstName = state.profile?.full_name?.split(" ")[0] ?? (isStaff ? "Librarian" : "there");

  const recentActivity = [...(state.auditLogs ?? [])]
    .filter(l => l.actor_id === state.profile?.id)
    .slice(0, 5);

  return (
    <div className="space-y-6 page-fade-in">
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName} 👋
          </h1>
          <p className="text-slate-500 mt-0.5">
            {isStaff ? "Here's your library operations overview." : "Here's your current library activity."}
          </p>
        </div>
        {state.config.demoMode && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-3 py-1">
            ⚡ Demo Mode — {state.config.sessionSeconds / 60} min sessions
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Armchair}      label="Free Desks"  value={String(counts.free)}                 sub={`${state.desks.length} total`}       color="bg-emerald-100 text-emerald-700" />
        <StatCard icon={Users}         label="Occupied"    value={String(counts.occupied + counts.away)} sub="desks in use"                       color="bg-red-100 text-red-700" />
        <StatCard icon={AlertTriangle} label="Abandoned"   value={String(counts.abandoned)}             sub={counts.abandoned > 0 ? "Needs attention" : "All clear"} color={counts.abandoned > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"} />
        <StatCard icon={Gauge}         label="Occupancy"   value={`${occupancyRate}%`}                  sub="current usage"                      color="bg-indigo-100 text-indigo-700" />
      </section>

      {/* Main Content */}
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {/* Active Session Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">{isStaff ? "Operational Overview" : "My Active Session"}</CardTitle>
              <CardDescription className="mt-0.5">
                {isStaff ? "Library-wide desk status." : "Your current desk and session controls."}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/app/map")}>
              <Map className="mr-1.5 h-3.5 w-3.5" />
              Live Map
            </Button>
          </CardHeader>
          <CardContent>
            {activeSession && activeDesk ? (
              <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6">
                {/* Presence warning banner */}
                {showPresence && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">Presence confirmation required</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Confirm you're still at your desk or it will be released in{" "}
                        <strong>{remaining}s</strong>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className={`${statusMeta[activeDesk.status].badge} border text-xs`}>
                        {statusMeta[activeDesk.status].label}
                      </Badge>
                      {activeSession.status === "away" && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-xs">
                          Away timer active
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-900">{activeDesk.label}</h3>
                    <p className="text-slate-500 font-medium mt-1">
                      {activeDesk.zone} · Floor {activeDesk.floor}
                    </p>

                    {/* Timer progress bar */}
                    <div className="mt-5">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>Session time remaining</span>
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {Math.floor(remaining / 60)}m {remaining % 60}s
                        </span>
                      </div>
                      <Progress
                        value={totalDuration > 0 ? (remaining / totalDuration) * 100 : 0}
                        className="h-2 bg-slate-100"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {activeSession.status === "active" ? (
                        <>
                          {showPresence && (
                            <Button
                              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                              onClick={() =>
                                void runAction("Presence confirmed", () =>
                                  apiRequest(`/api/sessions/${activeSession.id}/confirm-presence`, { method: "POST" })
                                )
                              }
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Confirm Presence
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                            onClick={() =>
                              void runAction("Stepping away", () =>
                                apiRequest(`/api/sessions/${activeSession.id}/away`, { method: "POST" })
                              )
                            }
                          >
                            <Coffee className="mr-1.5 h-4 w-4" />
                            Step Away
                          </Button>
                          <Button
                            variant="outline"
                            className="text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                            onClick={() =>
                              void runAction("Releasing desk", () =>
                                apiRequest(`/api/sessions/${activeSession.id}/release`, { method: "POST" })
                              )
                            }
                          >
                            Release Desk
                          </Button>
                        </>
                      ) : activeSession.status === "away" ? (
                        <Button
                          className="bg-indigo-600 hover:bg-indigo-700"
                          onClick={() =>
                            void runAction("Resuming session", () =>
                              apiRequest(`/api/sessions/${activeSession.id}/resume`, { method: "POST" })
                            )
                          }
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          I'm Back
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Countdown Ring */}
                  <div className="flex justify-center md:border-l md:border-slate-100 md:pl-6">
                    <CountdownRing seconds={remaining} total={totalDuration} large />
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                  <Armchair className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No active session</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  Browse the live map and scan a desk QR code when you arrive at your chosen seat.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button onClick={() => navigate("/app/map")} className="bg-indigo-600 hover:bg-indigo-700">
                    <Map className="mr-1.5 h-4 w-4" />
                    Find a Seat
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Citizenship Score */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Citizenship Score
              </CardTitle>
              <CardDescription>Your library standing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
                <div className="text-5xl font-extrabold text-slate-900 tabular-nums">{score}</div>
                <div className="text-sm text-slate-500 mt-0.5">out of 100</div>
                <Badge className={`mt-3 text-xs border ${badge.color}`}>
                  {badge.star} {badge.label}
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Reliability</span>
                    <span className="font-semibold text-slate-800">{score}%</span>
                  </div>
                  <Progress value={score} className="h-1.5 bg-slate-100" />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                Release desks voluntarily and respond to check-ins promptly to maintain your score.
              </p>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-medium text-slate-700 capitalize">
                      {log.action.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs"
                  onClick={() => navigate("/app/map")}
                >
                  View map <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Tip */}
          {!activeSession && (
            <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 flex-shrink-0">
                    <Zap className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-800">Pro tip</p>
                    <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                      Walk to a free desk and scan the QR code displayed on its screen to claim it instantly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
