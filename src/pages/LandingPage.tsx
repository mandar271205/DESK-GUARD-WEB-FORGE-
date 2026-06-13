import { useNavigate } from "react-router-dom";
import {
  BookOpen, ArrowRight, QrCode, Timer, BarChart3,
  ShieldCheck, WifiOff, Bell, Star, Wifi, Users,
  CheckCircle2, AlertTriangle, Eye, Clock, Zap, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Map,          title: "Live SVG Map",          desc: "Realtime colour-coded seat map updates every few seconds across all floors and zones.", color: "indigo" },
  { icon: QrCode,       title: "Rotating QR Security",  desc: "Server-issued, one-time use tokens that rotate every 30 seconds. No remote hoarding possible.", color: "teal" },
  { icon: Timer,        title: "Server-Side Timers",    desc: "Session countdowns run on the backend. Absent students are automatically released — no client tricks.", color: "amber" },
  { icon: ShieldCheck,  title: "Away Mode",             desc: "Students can mark themselves away for short breaks. The seat is held briefly, then released fairly.", color: "blue" },
  { icon: Bell,         title: "Notify Me When Free",   desc: "Subscribe to a desk and receive an alert the moment it becomes available.", color: "violet" },
  { icon: Zap,          title: "Accessibility Filter",  desc: "Instantly filter for wheelchair-accessible desks or power sockets with a single click.", color: "emerald" },
  { icon: Star,         title: "Smart Recommendations", desc: "AI-ranked desk suggestions based on your preferred zones, features, and study history.", color: "orange" },
  { icon: BarChart3,    title: "Librarian Analytics",   desc: "Hourly occupancy charts, zone utilization, abandonment trends, and CSV export.", color: "indigo" },
  { icon: Eye,          title: "Privacy-Friendly AI",   desc: "Object and person detection prototype — no facial recognition, no surveillance.", color: "violet" },
];

const steps = [
  { n: "01", icon: Map,         title: "Browse Live Availability", desc: "Check any free desk in real time on the public map — no account needed." },
  { n: "02", icon: CheckCircle2, title: "Walk to a Free Desk",      desc: "Spot your preferred desk and physically walk to it." },
  { n: "03", icon: QrCode,      title: "Scan the Desk QR Code",    desc: "The desk screen shows a live rotating QR. Scan it with your phone to claim." },
  { n: "04", icon: Clock,       title: "Use Fairly or Auto-Release", desc: "Your session runs on server timers. Left without releasing? Seat auto-frees for others." },
];

const problems = [
  { icon: AlertTriangle, color: "red",    title: "Bags Reserve Desks",         desc: "Unattended belongings occupy seats for hours, leaving no space for active students." },
  { icon: WifiOff,       color: "orange", title: "No Live Visibility",          desc: "Students wander every floor not knowing which desks are genuinely free right now." },
  { icon: Users,         color: "amber",  title: "Manual Librarian Monitoring", desc: "Staff must physically walk every aisle to detect and enforce policy violations." },
  { icon: Clock,         color: "slate",  title: "Wasted Peak Hours",           desc: "The busiest exam periods see the highest rate of seat hoarding and student frustration." },
];

const colorMap: Record<string, string> = {
  indigo:  "bg-indigo-100 text-indigo-600",
  teal:    "bg-teal-100 text-teal-600",
  amber:   "bg-amber-100 text-amber-600",
  blue:    "bg-blue-100 text-blue-600",
  violet:  "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
  orange:  "bg-orange-100 text-orange-600",
  red:     "bg-red-100 text-red-600",
  slate:   "bg-slate-100 text-slate-600",
};

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
      {/* ── NAV ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">DeskGuard</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#problem" className="hover:text-slate-900 transition-colors">Problem</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/map")}
              className="hidden sm:inline-flex"
            >
              <Wifi className="mr-1.5 h-3.5 w-3.5" />
              Live Map
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-white pt-20 pb-28 lg:pt-28 lg:pb-36">
          {/* Subtle gradient bg */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Badge className="mb-6 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50">
                🏛️ Smart Campus Library System
              </Badge>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Make every library{" "}
                <span className="text-gradient-indigo">seat count.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                DeskGuard prevents seat hoarding with realtime availability, secure rotating QR check-ins,
                automatic release timers, and powerful librarian insights.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/app/map")}
                  className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 w-full sm:w-auto"
                >
                  <Map className="mr-2 h-4 w-4" />
                  View Live Availability
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="h-12 px-8 text-base w-full sm:w-auto border-slate-200"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Stats row */}
              <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
                {[
                  { label: "Live desk updates", value: "Realtime" },
                  { label: "QR token rotation", value: "30s" },
                  { label: "Auto-release timer", value: "2 hrs" },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-extrabold text-indigo-600">{stat.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM ─────────────────────────────────────── */}
        <section id="problem" className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-14">
              <Badge className="mb-4 rounded-full bg-red-50 text-red-600 border-red-100 text-xs font-medium px-3 py-1">
                The Problem
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Seat hoarding is a real problem.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Students lose hours searching for seats that are technically empty but physically reserved by bags.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {problems.map((p) => (
                <Card key={p.title} className="border-slate-200 bg-white card-lift">
                  <CardContent className="p-6">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[p.color]}`}>
                      <p.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{p.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section id="how-it-works" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-14">
              <Badge className="mb-4 rounded-full bg-indigo-50 text-indigo-600 border-indigo-100 text-xs font-medium px-3 py-1">
                How It Works
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Four steps to a fair library.
              </h2>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.n} className="relative">
                  <div className="flex items-center justify-center mb-5">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600 shadow border border-indigo-100">
                        {step.n}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-center font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-center text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────── */}
        <section id="features" className="bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-14">
              <Badge className="mb-4 rounded-full bg-teal-50 text-teal-600 border-teal-100 text-xs font-medium px-3 py-1">
                Features
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Everything your library needs.
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                No more seat hoarding. Fair access for all students — powered by realtime technology.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feat) => (
                <Card key={feat.title} className="border-slate-200 bg-white card-lift">
                  <CardContent className="p-6">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[feat.color]}`}>
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1.5">{feat.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="bg-indigo-600 py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(139,92,246,0.3),transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Find your next study desk in seconds.
            </h2>
            <p className="mt-4 text-lg text-indigo-200">
              Join the smarter way to use your university library.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/app/map")}
                className="h-12 px-8 text-base bg-white text-indigo-600 hover:bg-indigo-50 font-semibold w-full sm:w-auto shadow-lg"
              >
                <Map className="mr-2 h-4 w-4" />
                View Live Map
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-base text-white border-white/30 hover:bg-white/10 w-full sm:w-auto"
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-base font-bold text-white">DeskGuard</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Smart library seat booking and anti-hoarding system. Making sure every seat belongs to the student using it.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><button onClick={() => navigate("/app/map")} className="hover:text-white transition-colors">Live Map</button></li>
                <li><button onClick={() => navigate("/auth")} className="hover:text-white transition-colors">Sign In</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Info</h4>
              <ul className="space-y-2.5 text-sm">
                <li><span className="text-slate-500">Hackathon Project</span></li>
                <li><span className="text-slate-500">Built with Supabase</span></li>
                <li><span className="text-slate-500">React + Vite + Tailwind</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs">&copy; {new Date().getFullYear()} DeskGuard. All rights reserved.</p>
            <div className="flex gap-4 text-xs">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
