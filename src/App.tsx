import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPublicAppUrl } from "./lib/app-url";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";
import {
  Accessibility,
  Activity,
  AlertTriangle,
  ArrowRight,
  Armchair,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Coffee,
  DoorOpen,
  Filter,
  Gauge,
  Home,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Map,
  Maximize2,
  Play,
  QrCode,
  RefreshCcw,
  ScanLine,
  Search,
  ShieldCheck,
  TimerReset,
  UserPlus,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  type LucideIcon
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { apiRequest } from "./api";
import { missingSupabaseConfig, supabase } from "./supabaseClient";
import type {
  AppState,
  AuditLog,
  ClaimPreview,
  Desk,
  DeskStatus,
  IssuedQR,
  NotificationItem,
  QRDisplay,
  SessionRecord
} from "./types";

type ViewId = "dashboard" | "map" | "session" | "score" | "operations" | "analytics" | "logs" | "qr-displays";

type AppRoute =
  | { kind: "landing" }
  | { kind: "auth" }
  | { kind: "reset-password" }
  | { kind: "app" }
  | { kind: "claim"; token: string }
  | { kind: "desk"; code: string }
  | { kind: "qr-displays" }
  | { kind: "qr-display"; deskId: string }
  | { kind: "public-display"; displayPublicId: string };

const statusOrder: DeskStatus[] = ["free", "occupied", "away", "abandoned", "unavailable"];

const statusMeta: Record<
  DeskStatus,
  {
    label: string;
    fill: string;
    stroke: string;
    bg: string;
    text: string;
    badge: string;
  }
> = {
  free: {
    label: "Free",
    fill: "#1f9d67",
    stroke: "#116447",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800"
  },
  occupied: {
    label: "Occupied",
    fill: "#cf3e45",
    stroke: "#8f2229",
    bg: "bg-rose-50",
    text: "text-rose-800",
    badge: "border-rose-200 bg-rose-50 text-rose-800"
  },
  away: {
    label: "Away",
    fill: "#d7a316",
    stroke: "#91690b",
    bg: "bg-amber-50",
    text: "text-amber-800",
    badge: "border-amber-200 bg-amber-50 text-amber-800"
  },
  abandoned: {
    label: "Abandoned",
    fill: "#e0692e",
    stroke: "#9b3a14",
    bg: "bg-orange-50",
    text: "text-orange-800",
    badge: "border-orange-200 bg-orange-50 text-orange-800"
  },
  unavailable: {
    label: "Unavailable",
    fill: "#71717a",
    stroke: "#3f3f46",
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    badge: "border-zinc-200 bg-zinc-100 text-zinc-700"
  }
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function deskFromSession(session: SessionRecord | null | undefined) {
  return session?.desk ?? session?.desks ?? null;
}

function deskFromAudit(log: AuditLog) {
  return log.desk ?? log.desks ?? null;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function secondsUntil(iso: string | null | undefined, now: number) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
}

function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusCounts(desks: Desk[]) {
  return statusOrder.reduce(
    (acc, status) => ({
      ...acc,
      [status]: desks.filter((desk) => desk.status === status).length
    }),
    {} as Record<DeskStatus, number>
  );
}

function actionLabel(action: string) {
  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Ai", "AI");
}

function currentRoute(): AppRoute {
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);

  if (pathname === "/auth") return { kind: "auth" };
  if (pathname === "/reset-password") return { kind: "reset-password" };
  if (pathname === "/app" || pathname === "/map" || pathname === "/profile" || pathname === "/librarian") {
    return { kind: "app" };
  }
  if (pathname === "/claim") return { kind: "claim", token: params.get("token") ?? "" };
  if (pathname.startsWith("/desk/")) return { kind: "desk", code: decodeURIComponent(pathname.slice("/desk/".length)) };
  if (pathname === "/librarian/qr-displays") return { kind: "qr-displays" };
  if (pathname.startsWith("/librarian/qr-display/")) {
    return { kind: "qr-display", deskId: decodeURIComponent(pathname.slice("/librarian/qr-display/".length)) };
  }
  if (pathname.startsWith("/display/")) {
    return { kind: "public-display", displayPublicId: decodeURIComponent(pathname.slice("/display/".length)) };
  }
  return { kind: "landing" };
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("deskguard:navigate"));
}

function extractClaimToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed, getPublicAppUrl());
    const token = url.searchParams.get("token");
    if (url.pathname === "/claim" && token) return token;
  } catch {
    return trimmed;
  }
  return trimmed;
}

function displayPublicIdForDesk(desk: Desk, displays: QRDisplay[] = []) {
  const registered = displays.find((display) => display.desk_id === desk.id || displayDesk(display)?.id === desk.id);
  return registered?.display_public_id ?? `display-${desk.code.toLowerCase()}-live`;
}

function displayDesk(display: QRDisplay) {
  return display.desk ?? display.desks ?? null;
}

export default function App() {
  const [authSession, setAuthSession] = useState<SupabaseSession | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [view, setView] = useState<ViewId>("dashboard");
  const [toast, setToast] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [route, setRoute] = useState<AppRoute>(() => currentRoute());

  const refreshState = useCallback(async () => {
    const next = await apiRequest<AppState>("/api/state");
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("deskguard:navigate", syncRoute);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("deskguard:navigate", syncRoute);
    };
  }, []);

  useEffect(() => {
    if (route.kind === "qr-displays") setView("qr-displays");
    if (window.location.pathname === "/map") setView("map");
  }, [route.kind]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setAuthSession(data.session);
        setInitializing(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      if (!session) {
        setState(null);
        setView("dashboard");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authSession) return;
    refreshState().catch((error) => setToast(error.message));
  }, [authSession, refreshState]);

  useEffect(() => {
    if (!authSession) return;

    const channel = supabase
      .channel("deskguard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "desks" }, () => {
        refreshState().catch((error) => setToast(error.message));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        refreshState().catch((error) => setToast(error.message));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => {
        refreshState().catch((error) => setToast(error.message));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        refreshState().catch((error) => setToast(error.message));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authSession, refreshState]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runAction = useCallback(
    async (label: string, callback: () => Promise<AppState | { state: AppState }>) => {
      setAction(label);
      try {
        const result = await callback();
        setState("state" in result ? result.state : result);
        setToast(label);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setAction(null);
      }
    },
    []
  );

  if (missingSupabaseConfig) {
    return <ConfigErrorScreen />;
  }

  if (route.kind === "public-display") {
    return <PublicDisplayPage displayPublicId={route.displayPublicId} now={now} />;
  }

  if (initializing) {
    return <LoadingScreen label="Opening DeskGuard" />;
  }

  if (!authSession) {
    if (route.kind === "landing") return <LandingPage />;
    if (route.kind === "reset-password") return <ResetPasswordScreen />;
    const redirectTo =
      route.kind === "claim"
        ? `/claim?token=${encodeURIComponent(route.token)}`
        : route.kind === "auth"
          ? "/app"
          : window.location.pathname + window.location.search;
    return <AuthScreen redirectTo={redirectTo || "/app"} />;
  }

  if (route.kind === "reset-password") {
    return <ResetPasswordScreen />;
  }

  if (!state) {
    return <LoadingScreen label="Syncing live desks" />;
  }

  const isStaff = state.profile.role === "librarian" || state.profile.role === "admin";
  const counts = statusCounts(state.desks);
  const activeDesk = deskFromSession(state.activeSession);
  const totalUsable = state.desks.length - counts.unavailable;
  const occupancyRate = totalUsable > 0 ? Math.round(((counts.occupied + counts.away) / totalUsable) * 100) : 0;

  if (route.kind === "claim") {
    return (
      <ClaimPage
        token={route.token}
        state={state}
        now={now}
        refreshState={refreshState}
        setToast={setToast}
      />
    );
  }

  if (route.kind === "desk") {
    return <DeskInfoPage code={route.code} state={state} />;
  }

  if ((route.kind === "qr-display" || route.kind === "qr-displays") && !isStaff) {
    return <AccessDeniedScreen />;
  }

  if (route.kind === "qr-display") {
    const desk = state.desks.find((item) => item.id === route.deskId);
    return desk ? <VirtualQrDisplayPage desk={desk} now={now} /> : <NotFoundScreen label="Desk not found" />;
  }

  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "map" as const, label: "Live Map", icon: Map },
    { id: "session" as const, label: "Session", icon: TimerReset },
    { id: "score" as const, label: "Score", icon: ShieldCheck },
    ...(isStaff
      ? [
          { id: "operations" as const, label: "Operations", icon: Wrench },
          { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
          { id: "logs" as const, label: "Audit Logs", icon: Activity },
          { id: "qr-displays" as const, label: "QR Displays", icon: QrCode }
        ]
      : [])
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">DeskGuard</h1>
              <p className="text-sm text-slate-600">Closing the gap between reserved and present.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
              <Circle className="h-2.5 w-2.5 fill-teal-500 text-teal-500" aria-hidden="true" />
              {state.config.demoMode ? "Demo timers active" : "Production timers"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              {state.profile.full_name}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-max rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    navigateTo(item.id === "qr-displays" ? "/librarian/qr-displays" : item.id === "map" ? "/map" : "/app");
                  }}
                  className={cx(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition",
                    view === item.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          {view === "dashboard" && (
            <DashboardView
              state={state}
              counts={counts}
              activeDesk={activeDesk}
              occupancyRate={occupancyRate}
              isStaff={isStaff}
              now={now}
              setView={setView}
              runAction={runAction}
              action={action}
            />
          )}
          {view === "map" && (
            <MapView
              state={state}
              now={now}
              runAction={runAction}
              action={action}
              isStaff={isStaff}
            />
          )}
          {view === "session" && (
            <SessionView state={state} now={now} runAction={runAction} action={action} setView={setView} />
          )}
          {view === "score" && <ScoreView state={state} />}
          {view === "operations" && isStaff && (
            <OperationsView state={state} runAction={runAction} action={action} />
          )}
          {view === "analytics" && isStaff && <AnalyticsView state={state} counts={counts} occupancyRate={occupancyRate} />}
          {view === "logs" && isStaff && <AuditLogView logs={state.auditLogs} />}
          {view === "qr-displays" && isStaff && <QRDisplaysView state={state} />}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-soft">
          {toast}
        </div>
      )}
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-center shadow-soft">
        <RefreshCcw className="mx-auto mb-3 h-7 w-7 animate-spin text-teal-700" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-800">{label}</p>
      </div>
    </div>
  );
}

function ConfigErrorScreen() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <section className="max-w-xl rounded-lg border border-rose-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-rose-700" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">Supabase configuration missing</h1>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`, then restart the dev server.
        </p>
      </section>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-normal text-slate-950">DeskGuard</span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo("/auth")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign in
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>
      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-slate-950">
              DeskGuard
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              A Supabase-powered library seat platform where live maps, rotating QR codes, server timers, and librarian tools keep desks fair.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateTo("/auth")}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create account
              </button>
              <button
                type="button"
                onClick={() => navigateTo("/auth")}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                Sign in
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <MiniPreviewMap />
          </div>
        </section>
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3">
            <FeatureTile icon={QrCode} title="Live QR presence" body="Desk displays issue short-lived, one-time QR claim links." />
            <FeatureTile icon={TimerReset} title="Server timers" body="Away and presence deadlines are enforced from backend timestamps." />
            <FeatureTile icon={BarChart3} title="Librarian operations" body="Staff can reset desks, block maintenance seats, and inspect event trends." />
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500 sm:px-6">
        DeskGuard ensures a desk belongs to the student actually using it.
      </footer>
    </div>
  );
}

function mapAuthError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) return "Email or password is incorrect.";
  if (msg.includes("user already registered") || msg.includes("already exists")) return "An account with this email already exists.";
  if (msg.includes("rate limit") || msg.includes("too many requests")) return "Too many authentication emails were requested. Please wait briefly and try again.";
  if (msg.includes("email not confirmed") || msg.includes("verify your email")) return "Verify your email before signing in.";
  if (msg.includes("missing") && (msg.includes("url") || msg.includes("key") || msg.includes("configuration"))) return "Supabase configuration is missing.";
  if (msg.includes("network") || msg.includes("failed to fetch")) return "Unable to connect. Check your connection and try again.";
  if (msg.includes("weak") && msg.includes("password")) return "Use a stronger password.";
  return message;
}

function AuthScreen({ redirectTo }: { redirectTo: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    if (!email || !password || (mode === "signup" && !fullName.trim())) {
      setError("Fill in all required fields.");
      setBusy(false);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${getPublicAppUrl()}/app`
        }
      });
      if (signUpError) setError(mapAuthError(signUpError.message));
      else if (!data.session) setMessage("Account created successfully. Check your inbox and verify your email before signing in.");
      else navigateTo(redirectTo || "/app");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(mapAuthError(signInError.message));
      else navigateTo(redirectTo || "/app");
    }

    setBusy(false);
  };

  const forgotPassword = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getPublicAppUrl()}/reset-password`
    });
    setBusy(false);
    if (resetError) setError(mapAuthError(resetError.message));
    else setMessage("Password reset email sent.");
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft lg:grid-cols-[1fr_1fr]">
        <section className="bg-slate-950 p-8 text-white">
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="mb-8 inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/10"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </button>
          <h1 className="text-4xl font-semibold tracking-normal">Secure library access</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Public signup creates student accounts only. Librarian access is granted later by a database administrator.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <MetricTile icon={QrCode} label="QR tokens" value="One use" tone="dark" />
            <MetricTile icon={Clock3} label="QR expiry" value="35s" tone="dark" />
            <MetricTile icon={ShieldCheck} label="Role source" value="Server" tone="dark" />
            <MetricTile icon={Wifi} label="Realtime" value="Live" tone="dark" />
          </div>
        </section>
        <section className="p-8">
          <div className="mb-6 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["signin", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cx(
                  "h-10 flex-1 rounded-md text-sm font-semibold",
                  mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
                )}
              >
                {item === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {mode === "signup" && (
              <TextInput label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
            )}
            <TextInput label="Email" value={email} onChange={setEmail} autoComplete="email" />
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />
            {mode === "signup" && (
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
            )}
            {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
            {message && <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p>}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {mode === "signin" ? <DoorOpen className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              {busy ? "Working" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => void forgotPassword()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Forgot password
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updatePassword = async () => {
    setError(null);
    setMessage(null);
    if (!password || password !== confirmPassword) {
      setError("Enter matching passwords.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(mapAuthError(updateError.message));
    else {
      setMessage("Password updated.");
      window.setTimeout(() => navigateTo("/app"), 900);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Reset password</h1>
        <div className="mt-5 grid gap-3">
          <PasswordInput label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
          <PasswordInput label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
          {message && <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p>}
          <button
            type="button"
            onClick={() => void updatePassword()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {busy ? "Updating" : "Update password"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ClaimPage({
  token,
  state,
  now,
  refreshState,
  setToast
}: {
  token: string;
  state: AppState;
  now: number;
  refreshState: () => Promise<AppState>;
  setToast: (message: string | null) => void;
}) {
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPreview({ status: "invalid" });
      return;
    }
    apiRequest<ClaimPreview>(`/api/claim/preview?token=${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to inspect QR token."));
  }, [token]);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest<AppState>("/api/claim", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      await refreshState();
      setToast("Desk claimed with live QR");
      navigateTo("/app");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to claim this desk.");
      await apiRequest<ClaimPreview>(`/api/claim/preview?token=${encodeURIComponent(token)}`)
        .then(setPreview)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const statusCopy: Record<ClaimPreview["status"], { title: string; body: string; tone: string }> = {
    valid: {
      title: "Ready to claim",
      body: "This live QR token is valid and can be used once.",
      tone: "border-teal-200 bg-teal-50 text-teal-900"
    },
    invalid: {
      title: "Invalid QR code",
      body: "Please scan the latest live QR code displayed at the desk.",
      tone: "border-rose-200 bg-rose-50 text-rose-900"
    },
    expired: {
      title: "This QR code has expired.",
      body: "Please scan the new live QR code displayed at the desk.",
      tone: "border-amber-200 bg-amber-50 text-amber-900"
    },
    used: {
      title: "This QR code has already been used.",
      body: "Please scan the latest QR code displayed at the desk.",
      tone: "border-amber-200 bg-amber-50 text-amber-900"
    },
    revoked: {
      title: "This QR code was refreshed.",
      body: "Please scan the live QR code currently displayed at the desk.",
      tone: "border-amber-200 bg-amber-50 text-amber-900"
    },
    desk_occupied: {
      title: "This desk has already been claimed.",
      body: "Please choose another available desk.",
      tone: "border-rose-200 bg-rose-50 text-rose-900"
    }
  };

  const copy = preview ? statusCopy[preview.status] : null;
  const activeDesk = deskFromSession(state.activeSession);
  const remaining = secondsUntil(preview?.expires_at, now);

  return (
    <RouteShell title="Live QR claim">
      <section className="mx-auto grid max-w-3xl gap-5 px-4 py-8 sm:px-6">
        {preview?.desk && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Desk</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-normal text-slate-950">{preview.desk.label}</h1>
            <p className="mt-2 text-slate-600">
              {preview.desk.zone} · Floor {preview.desk.floor}
            </p>
          </div>
        )}

        {!preview && !error && <LoadingScreen label="Checking QR token" />}

        {copy && (
          <div className={cx("rounded-lg border p-5", copy.tone)}>
            <h2 className="text-xl font-semibold tracking-normal">{copy.title}</h2>
            <p className="mt-2 text-sm leading-6">{copy.body}</p>
            {preview?.status === "valid" && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-sm font-semibold">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                Expires in {formatDuration(remaining)}
              </p>
            )}
          </div>
        )}

        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

        <div className="flex flex-wrap gap-3">
          {preview?.status === "valid" && !activeDesk && (
            <button
              type="button"
              onClick={() => void claim()}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {busy ? "Claiming" : "Claim this desk"}
            </button>
          )}
          {activeDesk && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              You already have active desk {activeDesk.label}.
            </p>
          )}
          <button
            type="button"
            onClick={() => navigateTo("/map")}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            Return to map
          </button>
        </div>
      </section>
    </RouteShell>
  );
}

function DeskInfoPage({ code, state }: { code: string; state: AppState }) {
  const desk = state.desks.find((item) => item.code.toLowerCase() === code.toLowerCase());

  if (!desk) {
    return <NotFoundScreen label="Desk not found" />;
  }

  return (
    <RouteShell title={desk.label}>
      <section className="mx-auto grid max-w-3xl gap-5 px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Static desk label</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-normal text-slate-950">{desk.label}</h1>
              <p className="mt-2 text-slate-600">
                {desk.zone} · Floor {desk.floor} · {desk.code}
              </p>
            </div>
            <StatusBadge status={desk.status} />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {desk.is_accessible && <InfoPill icon={Accessibility} label="Accessible" />}
            {desk.features.map((feature) => (
              <InfoPill key={feature} icon={Circle} label={feature} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="text-lg font-semibold tracking-normal">Live QR required</h2>
          <p className="mt-2 text-sm leading-6">
            This static page identifies the desk and shows availability, but it cannot claim the seat. Scan the live rotating QR code displayed at the desk or kiosk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigateTo("/map")}
          className="inline-flex h-11 w-max items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Map className="h-4 w-4" aria-hidden="true" />
          Browse available desks
        </button>
      </section>
    </RouteShell>
  );
}

function VirtualQrDisplayPage({ desk, now }: { desk: Desk; now: number }) {
  const issue = useCallback(
    () =>
      apiRequest<IssuedQR>(`/api/librarian/qr-display/${desk.id}/issue`, {
        method: "POST",
        body: JSON.stringify({ baseUrl: getPublicAppUrl() }),
      }),
    [desk.id]
  );

  const publicUrl = getPublicAppUrl();
  const isInvalidProdConfig = import.meta.env.PROD && (publicUrl.includes("localhost") || publicUrl.includes("192.168."));

  return (
    <RouteShell title={`${desk.label} live QR`}>
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {isInvalidProdConfig && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-medium text-amber-800">Production QR configuration is invalid.</h3>
            <p className="mt-1 text-sm text-amber-700">Set VITE_PUBLIC_APP_URL to the deployed HTTPS domain.</p>
          </div>
        )}
        <LiveDeskQRCode
          now={now}
          modeLabel="Librarian virtual display"
          issue={issue}
        />
      </section>
    </RouteShell>
  );
}

function PublicDisplayPage({ displayPublicId, now }: { displayPublicId: string; now: number }) {
  const issue = useCallback(async () => {
    const params = new URLSearchParams({ baseUrl: getPublicAppUrl() });
    const response = await fetch(`/api/display/${encodeURIComponent(displayPublicId)}/issue-qr?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error ?? "Unable to issue QR.");
    return payload as IssuedQR;
  }, [displayPublicId]);

  const publicUrl = getPublicAppUrl();
  const isInvalidProdConfig = import.meta.env.PROD && (publicUrl.includes("localhost") || publicUrl.includes("192.168."));

  return (
    <section className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      {isInvalidProdConfig && (
        <div className="mx-auto mb-6 max-w-4xl rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-amber-800">Production QR configuration is invalid.</h3>
          <p className="mt-1 text-sm text-amber-700">Set VITE_PUBLIC_APP_URL to the deployed HTTPS domain.</p>
        </div>
      )}
      <LiveDeskQRCode
        now={now}
        kiosk
        modeLabel="Kiosk display"
        issue={issue}
      />
    </section>
  );
}

function LiveDeskQRCode({
  issue,
  now,
  modeLabel,
  kiosk = false
}: {
  issue: () => Promise<IssuedQR>;
  now: number;
  modeLabel: string;
  kiosk?: boolean;
}) {
  const [issued, setIssued] = useState<IssuedQR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await issue();
      setIssued(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to refresh QR code.");
    } finally {
      setLoading(false);
    }
  }, [issue]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!issued) return;
    const timer = window.setTimeout(() => void refresh(), Math.max(3000, issued.rotation_seconds * 1000));
    return () => window.clearTimeout(timer);
  }, [issued, refresh]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const remaining = secondsUntil(issued?.expires_at, now);
  const expired = Boolean(issued && remaining <= 0);
  const canShowQr = issued && !expired && !loading;
  const isLocalDisplayOrigin = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  const fullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div className={cx("rounded-lg border p-6 shadow-soft", kiosk ? "border-white/10 bg-white text-slate-950" : "border-slate-200 bg-white")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">{modeLabel}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-normal text-slate-950">
            {issued?.desk.label ?? "Live desk display"}
          </h1>
          <p className="mt-2 text-slate-600">
            {issued ? `${issued.desk.zone} · Floor ${issued.desk.floor}` : "Requesting live QR token"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cx("inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium", online ? "border-teal-200 bg-teal-50 text-teal-800" : "border-rose-200 bg-rose-50 text-rose-800")}>
            {online ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
            {online ? "Connected" : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => void fullscreen()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Fullscreen
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-center">
        <div className="grid aspect-square place-items-center rounded-lg border border-slate-200 bg-slate-50 p-5">
          {canShowQr ? (
            <QRCodeSVG value={issued.claim_url} size={280} level="M" includeMargin />
          ) : (
            <div className="text-center">
              <RefreshCcw className="mx-auto mb-3 h-8 w-8 animate-spin text-teal-700" aria-hidden="true" />
              <p className="font-semibold text-slate-800">Refreshing QR code...</p>
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <CountdownRing seconds={remaining} total={issued?.expiry_seconds ?? 120} large />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Expires in {formatDuration(remaining)}</p>
            <p className="mt-1 text-sm text-slate-600">
              QR refreshes every {issued?.rotation_seconds ?? 120} seconds. Old screenshots and reused links fail.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Last refreshed: {issued ? new Date(issued.issued_at).toLocaleTimeString() : "waiting"}
            </p>
          </div>
          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
          {isLocalDisplayOrigin && (
            <p className="inline-flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Phone scans need this display opened from your computer network address, not localhost.
            </p>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex h-10 w-max items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh now
          </button>
        </div>
      </div>
    </div>
  );
}

function QRDisplaysView({ state }: { state: AppState }) {
  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-normal text-slate-950">QR Displays</h2>
        <p className="mt-1 text-sm text-slate-600">
          Open a virtual live display for any desk. Each display requests short-lived, single-use QR claim links from the server.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.desks.map((desk) => (
          <div key={desk.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-normal text-slate-950">{desk.label}</h3>
                <p className="text-sm text-slate-600">
                  {desk.zone} · Floor {desk.floor}
                </p>
              </div>
              <StatusBadge status={desk.status} />
            </div>
            <button
              type="button"
              onClick={() => navigateTo(`/librarian/qr-display/${desk.id}`)}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" />
              Open display
            </button>
          </div>
        ))}
      </div>
      {state.qrDisplays.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold tracking-normal text-slate-950">Registered display URLs</h3>
          <div className="mt-3 grid gap-2">
            {state.qrDisplays.map((display) => {
              const desk = displayDesk(display);
              return (
                <div key={display.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{display.display_name}</p>
                    <p className="text-xs text-slate-500">
                      {desk?.label ?? "Desk"} · /display/{display.display_public_id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo(`/display/${display.display_public_id}`)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    Open kiosk
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function RouteShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <button type="button" onClick={() => navigateTo("/app")} className="flex items-center gap-3 text-left">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-normal text-slate-950">DeskGuard</p>
              <p className="text-xs text-slate-500">{title}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/app")}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            App
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function AccessDeniedScreen() {
  return (
    <RouteShell title="Access denied">
      <section className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-700" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">Librarian access required</h1>
        <p className="mt-2 text-sm text-slate-600">This page checks the server-backed profile role.</p>
      </section>
    </RouteShell>
  );
}

function NotFoundScreen({ label }: { label: string }) {
  return (
    <RouteShell title={label}>
      <section className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-700" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">{label}</h1>
        <button
          type="button"
          onClick={() => navigateTo("/app")}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Back to app
        </button>
      </section>
    </RouteShell>
  );
}

function TextInput({
  label,
  value,
  onChange,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="h-11 rounded-md border border-slate-200 px-3 text-slate-950"
      />
    </label>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border border-slate-200">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          className="h-11 border-0 px-3 text-slate-950 outline-none"
          autoComplete="current-password"
        />
        <button type="button" onClick={onToggle} className="grid h-11 w-11 place-items-center text-slate-500 hover:bg-slate-50">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </label>
  );
}

function FeatureTile({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-6 w-6 text-teal-700" aria-hidden="true" />
      <h3 className="mt-3 font-semibold tracking-normal text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function MiniPreviewMap() {
  const demo: Desk[] = Array.from({ length: 12 }, (_, index) => ({
    id: String(index),
    code: `preview-${index}`,
    label: `D-${String(index + 1).padStart(2, "0")}`,
    floor: 1,
    zone: index < 4 ? "Quiet" : index < 8 ? "Window" : "Focus",
    x: 10 + (index % 4) * 20,
    y: 18 + Math.floor(index / 4) * 24,
    width: 11,
    height: 8,
    status: (index === 2 ? "occupied" : index === 7 ? "away" : "free") as DeskStatus,
    features: [],
    is_accessible: false,
    current_session_id: null,
    status_changed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  return <FloorMapSvg desks={demo} selectedDeskId={null} onSelect={() => undefined} />;
}

function DashboardView({
  state,
  counts,
  activeDesk,
  occupancyRate,
  isStaff,
  now,
  setView,
  runAction,
  action
}: {
  state: AppState;
  counts: Record<DeskStatus, number>;
  activeDesk: Desk | null;
  occupancyRate: number;
  isStaff: boolean;
  now: number;
  setView: (view: ViewId) => void;
  runAction: (label: string, callback: () => Promise<AppState | { state: AppState }>) => Promise<void>;
  action: string | null;
}) {
  const activeSession = state.activeSession;
  const deadline =
    activeSession?.status === "away" ? activeSession.away_expires_at : activeSession?.active_expires_at;
  const remaining = secondsUntil(deadline, now);
  const recentAbandoned = state.auditLogs.filter((log) => log.action.includes("abandoned")).slice(0, 3);

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={Armchair} label="Free desks" value={String(counts.free)} />
        <MetricTile icon={Users} label="Occupied" value={String(counts.occupied + counts.away)} />
        <MetricTile icon={AlertTriangle} label="Abandoned" value={String(counts.abandoned)} />
        <MetricTile icon={Gauge} label="Occupancy" value={`${occupancyRate}%`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                {isStaff ? "Operational Snapshot" : "My Desk"}
              </h2>
              <p className="text-sm text-slate-600">
                {isStaff ? "Current states across the library." : "Current session and quick actions."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("map")}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Map className="h-4 w-4" aria-hidden="true" />
              Live map
            </button>
          </div>

          {activeSession && activeDesk ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_170px]">
              <div className={cx("rounded-lg border p-4", statusMeta[activeDesk.status].badge)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium opacity-80">Active seat</p>
                    <h3 className="mt-1 text-3xl font-semibold tracking-normal">{activeDesk.label}</h3>
                    <p className="mt-1 text-sm">
                      {activeDesk.zone} · Floor {activeDesk.floor}
                    </p>
                  </div>
                  <StatusBadge status={activeDesk.status} />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-sm font-semibold">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {formatDuration(remaining)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setView("session")}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <TimerReset className="h-4 w-4" aria-hidden="true" />
                    Session
                  </button>
                </div>
              </div>
              <CountdownRing seconds={remaining} total={activeSession.status === "away" ? state.config.awaySeconds : state.config.sessionSeconds} />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="text-xl font-semibold tracking-normal text-slate-950">
                  {isStaff ? "No staff desk session" : "No active desk"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {isStaff ? "Use operations for desk resets and maintenance." : "Claim a green desk from the live map."}
                </p>
              </div>
              {!isStaff && (
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <ScanLine className="h-4 w-4" aria-hidden="true" />
                  Find a seat
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                {isStaff ? "Recent Abandonments" : "Notifications"}
              </h2>
              <p className="text-sm text-slate-600">{isStaff ? "Auto-detected desk issues." : "Session updates."}</p>
            </div>
            {isStaff && (
              <button
                type="button"
                onClick={() =>
                  void runAction("Cleanup sweep complete", () =>
                    apiRequest<{ state: AppState }>("/api/cleanup/run", { method: "POST" })
                  )
                }
                disabled={Boolean(action)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Sweep
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            {isStaff ? (
              recentAbandoned.length > 0 ? (
                recentAbandoned.map((log) => <AuditListItem key={log.id} log={log} />)
              ) : (
                <EmptyState icon={CheckCircle2} title="No abandonment events" />
              )
            ) : state.notifications.length > 0 ? (
              state.notifications.map((item) => <NotificationRow key={item.id} item={item} />)
            ) : (
              <EmptyState icon={Bell} title="No notifications" />
            )}
          </div>
        </div>
      </section>

      <MiniFloorMap desks={state.desks} />
    </div>
  );
}

function MapView({
  state,
  now,
  runAction,
  action,
  isStaff
}: {
  state: AppState;
  now: number;
  runAction: (label: string, callback: () => Promise<AppState | { state: AppState }>) => Promise<void>;
  action: string | null;
  isStaff: boolean;
}) {
  const [floor, setFloor] = useState("all");
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState<DeskStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const floors = useMemo(() => Array.from(new Set(state.desks.map((desk) => desk.floor))).sort(), [state.desks]);
  const zones = useMemo(() => Array.from(new Set(state.desks.map((desk) => desk.zone))).sort(), [state.desks]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.desks.filter((desk) => {
      const floorMatch = floor === "all" || desk.floor === Number(floor);
      const zoneMatch = zone === "all" || desk.zone === zone;
      const statusMatch = status === "all" || desk.status === status;
      const queryMatch =
        !normalized ||
        desk.label.toLowerCase().includes(normalized) ||
        desk.code.toLowerCase().includes(normalized) ||
        desk.zone.toLowerCase().includes(normalized);
      return floorMatch && zoneMatch && statusMatch && queryMatch;
    });
  }, [floor, query, state.desks, status, zone]);

  const selectedDesk = state.desks.find((desk) => desk.id === selectedDeskId) ?? filtered[0] ?? null;
  const activeDesk = deskFromSession(state.activeSession);
  const selectedDisplayPublicId = selectedDesk ? displayPublicIdForDesk(selectedDesk, state.qrDisplays) : "";
  const canGenerateDeskQr = Boolean(selectedDesk && selectedDesk.status === "free" && !activeDesk && !action);

  const handleScannedClaim = useCallback((value: string) => {
    const token = extractClaimToken(value);
    if (token) {
      navigateTo(`/claim?token=${encodeURIComponent(token)}`);
    }
  }, []);

  useEffect(() => {
    if (!scannerOpen) return;

    let scanner: { render: (success: (decoded: string) => void, failure: () => void) => void; clear: () => Promise<void> };
    let cancelled = false;

    import("html5-qrcode")
      .then(({ Html5QrcodeScanner }) => {
        if (cancelled) return;
        scanner = new Html5QrcodeScanner(
          "deskguard-qr-reader",
          { fps: 10, qrbox: { width: 240, height: 240 } },
          false
        );
        scanner.render(
          (decoded) => {
            setScannerOpen(false);
            handleScannedClaim(decoded);
            void scanner.clear();
          },
          () => undefined
        );
      })
      .catch((error) => {
        setScannerOpen(false);
        console.error(error);
      });

    return () => {
      cancelled = true;
      if (scanner) {
        void scanner.clear().catch(() => undefined);
      }
    };
  }, [handleScannedClaim, scannerOpen]);

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Desk, code, or zone"
              className="h-10 rounded-md border border-slate-200 px-3"
            />
          </label>

          <SelectControl label="Floor" value={floor} onChange={setFloor}>
            <option value="all">All floors</option>
            {floors.map((item) => (
              <option key={item} value={item}>
                Floor {item}
              </option>
            ))}
          </SelectControl>

          <SelectControl label="Zone" value={zone} onChange={setZone}>
            <option value="all">All zones</option>
            {zones.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectControl>

          <SelectControl label="Status" value={status} onChange={(next) => setStatus(next as DeskStatus | "all")}>
            <option value="all">All statuses</option>
            {statusOrder.map((item) => (
              <option key={item} value={item}>
                {statusMeta[item].label}
              </option>
            ))}
          </SelectControl>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">Live Floor Map</h2>
              <p className="text-sm text-slate-600">{filtered.length} desks visible</p>
            </div>
            <StatusLegend />
          </div>
          <FloorMapSvg desks={filtered} selectedDeskId={selectedDesk?.id ?? null} onSelect={setSelectedDeskId} />
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {selectedDesk ? (
            <div className="grid gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Selected desk</p>
                  <h2 className="text-3xl font-semibold tracking-normal text-slate-950">{selectedDesk.label}</h2>
                  <p className="text-sm text-slate-600">
                    {selectedDesk.zone} · Floor {selectedDesk.floor}
                  </p>
                </div>
                <StatusBadge status={selectedDesk.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoPill icon={ScanLine} label={selectedDesk.code} />
                {selectedDesk.is_accessible && <InfoPill icon={Accessibility} label="Accessible" />}
                {selectedDesk.features.map((feature) => (
                  <InfoPill key={feature} icon={Circle} label={feature} />
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <QrCode className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-950">Live QR required</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Printed desk labels identify this desk only. Secure claiming requires the live rotating QR code shown on a desk display or kiosk.
                    </p>
                  </div>
                </div>
              </div>

              {!isStaff && (
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => navigateTo(`/display/${selectedDisplayPublicId}`)}
                    disabled={!canGenerateDeskQr}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    {activeDesk ? "Active desk already claimed" : selectedDesk.status === "free" ? "Generate QR code" : "Desk not free"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerOpen((open) => !open)}
                    disabled={Boolean(activeDesk)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ScanLine className="h-4 w-4" aria-hidden="true" />
                    {scannerOpen ? "Close scanner" : "Camera scan"}
                  </button>
                  {activeDesk && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Active desk: {activeDesk.label}
                    </p>
                  )}
                </div>
              )}

              {isStaff && (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo(`/librarian/qr-display/${selectedDesk.id}`)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    Open live display
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo(`/desk/${encodeURIComponent(selectedDesk.code)}`)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    Static desk page
                  </button>
                </div>
              )}

              {scannerOpen && <div id="deskguard-qr-reader" className="overflow-hidden rounded-lg border border-slate-200" />}
            </div>
          ) : (
            <EmptyState icon={Filter} title="No desks match the filters" />
          )}
        </aside>
      </section>
    </div>
  );
}

function SessionView({
  state,
  now,
  runAction,
  action,
  setView
}: {
  state: AppState;
  now: number;
  runAction: (label: string, callback: () => Promise<AppState | { state: AppState }>) => Promise<void>;
  action: string | null;
  setView: (view: ViewId) => void;
}) {
  const session = state.activeSession;
  const desk = deskFromSession(session);

  if (!session || !desk) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <EmptyState icon={Armchair} title="No active session" />
        <button
          type="button"
          onClick={() => setView("map")}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <Map className="h-4 w-4" aria-hidden="true" />
          Live map
        </button>
      </section>
    );
  }

  const deadline = session.status === "away" ? session.away_expires_at : session.active_expires_at;
  const remaining = secondsUntil(deadline, now);
  const total = session.status === "away" ? state.config.awaySeconds : state.config.sessionSeconds;
  const showPresence = session.status === "active" && remaining <= state.config.warningSeconds;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Current session</p>
            <h2 className="mt-1 text-4xl font-semibold tracking-normal text-slate-950">{desk.label}</h2>
            <p className="mt-2 text-slate-600">
              {desk.zone} · Floor {desk.floor} · Started {timeAgo(session.started_at)}
            </p>
          </div>
          <StatusBadge status={desk.status} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricTile icon={Clock3} label={session.status === "away" ? "Away expires" : "Session expires"} value={formatDuration(remaining)} />
          <MetricTile icon={ShieldCheck} label="Score" value={String(state.profile.citizenship_score)} />
          <MetricTile icon={RefreshCcw} label="Sweep interval" value={`${state.config.sweepSeconds}s`} />
        </div>

        {showPresence && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold tracking-normal">Presence check</h3>
                <p className="text-sm">This session is inside the confirmation window.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void runAction("Presence confirmed", () =>
                    apiRequest<AppState>(`/api/sessions/${session.id}/confirm-presence`, { method: "POST" })
                  )
                }
                disabled={Boolean(action)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Confirm
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {session.status === "active" && (
            <button
              type="button"
              onClick={() =>
                void runAction("Away Mode started", () =>
                  apiRequest<AppState>(`/api/sessions/${session.id}/away`, { method: "POST" })
                )
              }
              disabled={Boolean(action)}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <Coffee className="h-4 w-4" aria-hidden="true" />
              Take a break
            </button>
          )}
          {session.status === "away" && (
            <button
              type="button"
              onClick={() =>
                void runAction("Session resumed", () =>
                  apiRequest<AppState>(`/api/sessions/${session.id}/resume`, { method: "POST" })
                )
              }
              disabled={Boolean(action)}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              void runAction("Desk released", () =>
                apiRequest<AppState>(`/api/sessions/${session.id}/release`, { method: "POST" })
              )
            }
            disabled={Boolean(action)}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
          >
            <DoorOpen className="h-4 w-4" aria-hidden="true" />
            Release
          </button>
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <CountdownRing seconds={remaining} total={total} large />
        <div className="mt-5 grid gap-3">
          <InfoPill icon={ScanLine} label={desk.code} />
          <InfoPill icon={Map} label={`${desk.zone}, floor ${desk.floor}`} />
          {desk.features.map((feature) => (
            <InfoPill key={feature} icon={Circle} label={feature} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function ScoreView({ state }: { state: AppState }) {
  const score = state.profile.citizenship_score;
  const tier = score >= 90 ? "Gold" : score >= 75 ? "Silver" : score >= 60 ? "Bronze" : "Recovery";
  const scoreEvents = state.auditLogs.filter((log) =>
    ["desk_marked_abandoned", "desk_released_voluntarily", "presence_confirmed"].includes(log.action)
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-40 w-40 place-items-center rounded-full border-[14px] border-teal-600 bg-teal-50">
          <div>
            <p className="text-5xl font-semibold tracking-normal text-slate-950">{score}</p>
            <p className="text-sm font-semibold text-teal-800">{tier}</p>
          </div>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-normal text-slate-950">Library Citizenship</h2>
        <p className="mt-1 text-sm text-slate-600">Responsible desk usage is reflected here.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-normal text-slate-950">Score Activity</h2>
        <div className="mt-4 grid gap-3">
          {scoreEvents.length > 0 ? (
            scoreEvents.slice(0, 8).map((log) => <AuditListItem key={log.id} log={log} />)
          ) : (
            <EmptyState icon={ShieldCheck} title="No score events yet" />
          )}
        </div>
      </section>
    </div>
  );
}

function OperationsView({
  state,
  runAction,
  action
}: {
  state: AppState;
  runAction: (label: string, callback: () => Promise<AppState | { state: AppState }>) => Promise<void>;
  action: string | null;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DeskStatus | "all">("all");

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.desks.filter((desk) => {
      const queryMatch =
        !normalized ||
        desk.label.toLowerCase().includes(normalized) ||
        desk.code.toLowerCase().includes(normalized) ||
        desk.zone.toLowerCase().includes(normalized);
      const statusMatch = status === "all" || desk.status === status;
      return queryMatch && statusMatch;
    });
  }, [query, state.desks, status]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">Desk Operations</h2>
          <p className="text-sm text-slate-600">Reset desks and manage maintenance state.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_170px]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3"
            />
          </label>
          <SelectControl label="Status" value={status} onChange={(next) => setStatus(next as DeskStatus | "all")}>
            <option value="all">All</option>
            {statusOrder.map((item) => (
              <option key={item} value={item}>
                {statusMeta[item].label}
              </option>
            ))}
          </SelectControl>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Desk</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Zone</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Status</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Changed</th>
              <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((desk) => (
              <tr key={desk.id} className="border-b border-slate-100">
                <td className="border-b border-slate-100 px-3 py-3">
                  <div className="font-semibold text-slate-950">{desk.label}</div>
                  <div className="text-xs text-slate-500">{desk.code}</div>
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                  Floor {desk.floor} · {desk.zone}
                </td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <StatusBadge status={desk.status} />
                </td>
                <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{timeAgo(desk.status_changed_at)}</td>
                <td className="border-b border-slate-100 px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      title="Reset desk"
                      onClick={() =>
                        void runAction("Desk reset", () =>
                          apiRequest<AppState>(`/api/librarian/desks/${desk.id}/reset`, { method: "POST" })
                        )
                      }
                      disabled={Boolean(action)}
                      className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={desk.status === "unavailable" ? "Restore desk" : "Mark unavailable"}
                      onClick={() =>
                        void runAction(desk.status === "unavailable" ? "Desk restored" : "Desk unavailable", () =>
                          apiRequest<AppState>(`/api/librarian/desks/${desk.id}/status`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: desk.status === "unavailable" ? "free" : "unavailable" })
                          })
                        )
                      }
                      disabled={Boolean(action)}
                      className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Wrench className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AnalyticsView({
  state,
  counts,
  occupancyRate
}: {
  state: AppState;
  counts: Record<DeskStatus, number>;
  occupancyRate: number;
}) {
  const statusData = statusOrder.map((status) => ({
    name: statusMeta[status].label,
    value: counts[status],
    color: statusMeta[status].fill
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
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricTile icon={Gauge} label="Occupancy rate" value={`${occupancyRate}%`} />
        <MetricTile icon={AlertTriangle} label="Abandonments" value={String(counts.abandoned)} />
        <MetricTile icon={DoorOpen} label="Free desks" value={String(counts.free)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Desk Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Zone Utilization">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="free" stackId="a" fill="#1f9d67" />
              <Bar dataKey="occupied" stackId="a" fill="#cf3e45" />
              <Bar dataKey="unavailable" stackId="a" fill="#71717a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Audit Momentum">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={auditTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="events" stroke="#0f766e" fill="#99f6e4" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">Release Types</h2>
          <div className="mt-4 grid gap-3">
            {["desk_released_voluntarily", "desk_auto_released", "desk_reset_by_librarian", "desk_marked_abandoned"].map(
              (action) => (
                <div key={action} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-700">{actionLabel(action)}</span>
                  <span className="text-sm font-semibold text-slate-950">
                    {state.auditLogs.filter((log) => log.action === action).length}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function AuditLogView({ logs }: { logs: AuditLog[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-normal text-slate-950">Audit Logs</h2>
      <div className="mt-4 grid gap-3">
        {logs.length > 0 ? logs.map((log) => <AuditListItem key={log.id} log={log} />) : <EmptyState icon={Activity} title="No logs" />}
      </div>
    </section>
  );
}

function FloorMapSvg({
  desks,
  selectedDeskId,
  onSelect
}: {
  desks: Desk[];
  selectedDeskId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#f8faf8]">
      <svg viewBox="0 0 100 100" role="img" aria-label="Library floor map" className="aspect-[4/3] w-full">
        <rect x="0" y="0" width="100" height="100" fill="#f8faf8" />
        <path d="M4 8h92v84H4z" fill="none" stroke="#cbd5d0" strokeWidth="0.7" />
        <path d="M50 8v84M4 50h92" stroke="#e1e8e4" strokeWidth="0.6" />
        <rect x="7" y="6" width="20" height="4" rx="1" fill="#dbe7e2" />
        <rect x="73" y="90" width="18" height="4" rx="1" fill="#dbe7e2" />
        <text x="8" y="9" fontSize="2.5" fill="#475569">
          stacks
        </text>
        <text x="75" y="93" fontSize="2.5" fill="#475569">
          exit
        </text>
        {desks.map((desk) => {
          const meta = statusMeta[desk.status];
          const selected = selectedDeskId === desk.id;
          return (
            <g
              key={desk.id}
              role="button"
              tabIndex={0}
              aria-label={`${desk.label} ${meta.label}`}
              onClick={() => onSelect(desk.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(desk.id);
              }}
              className={cx("cursor-pointer", ["away", "abandoned"].includes(desk.status) && "desk-pulse")}
            >
              <rect
                x={desk.x}
                y={desk.y}
                width={desk.width}
                height={desk.height}
                rx="1.4"
                fill={meta.fill}
                stroke={selected ? "#0f172a" : meta.stroke}
                strokeWidth={selected ? 1.6 : 0.8}
              />
              <rect x={desk.x + 1} y={desk.y + 1} width={desk.width - 2} height="1.2" rx="0.6" fill="rgba(255,255,255,0.42)" />
              <text
                x={desk.x + desk.width / 2}
                y={desk.y + desk.height / 2 + 0.9}
                textAnchor="middle"
                fontSize="2.25"
                fontWeight="700"
                fill="#ffffff"
              >
                {desk.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiniFloorMap({ desks }: { desks: Desk[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">Library Map</h2>
          <p className="text-sm text-slate-600">Realtime desk state overview.</p>
        </div>
        <StatusLegend />
      </div>
      <FloorMapSvg desks={desks} selectedDeskId={null} onSelect={() => undefined} />
    </section>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {statusOrder.map((status) => (
        <span key={status} className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", statusMeta[status].badge)}>
          <Circle className="h-2.5 w-2.5" fill={statusMeta[status].fill} color={statusMeta[status].fill} aria-hidden="true" />
          {statusMeta[status].label}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: DeskStatus }) {
  return (
    <span className={cx("inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold", statusMeta[status].badge)}>
      <Circle className="h-2.5 w-2.5" fill={statusMeta[status].fill} color={statusMeta[status].fill} aria-hidden="true" />
      {statusMeta[status].label}
    </span>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone = "light"
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cx(
        "rounded-lg border p-4",
        tone === "dark" ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-white shadow-sm"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={cx("text-sm font-medium", tone === "dark" ? "text-slate-300" : "text-slate-500")}>{label}</p>
        <Icon className={cx("h-5 w-5", tone === "dark" ? "text-teal-300" : "text-teal-700")} aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}

function CountdownRing({ seconds, total, large = false }: { seconds: number; total: number; large?: boolean }) {
  const radius = large ? 58 : 46;
  const size = large ? 150 : 126;
  const stroke = large ? 12 : 10;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;

  return (
    <div className="grid place-items-center rounded-lg border border-slate-200 bg-slate-50 p-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Countdown">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#dbe7e2" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={seconds <= 15 ? "#d97706" : "#0f766e"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - circumference * progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fontSize={large ? 24 : 20} fontWeight="700" fill="#0f172a">
          {formatDuration(seconds)}
        </text>
        <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#64748b">
          remaining
        </text>
      </svg>
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3">
        {children}
      </select>
    </label>
  );
}

function InfoPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
      <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      {label}
    </span>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{item.title}</p>
          <p className="text-sm text-slate-600">{item.body}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-500">{timeAgo(item.created_at)}</span>
      </div>
    </div>
  );
}

function AuditListItem({ log }: { log: AuditLog }) {
  const desk = deskFromAudit(log);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{actionLabel(log.action)}</p>
        <span className="text-xs font-medium text-slate-500">{timeAgo(log.created_at)}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {desk ? `${desk.label} · ${desk.zone}` : "System event"} · {log.actor_role}
      </p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-normal text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
      <Icon className="mb-2 h-7 w-7 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}
