import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, UserPlus, Lock, QrCode, TimerReset, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniPreviewMap } from "../components/map/MiniPreviewMap"; // We will create this

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">DeskGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => navigate("/auth")}>
              Log in
            </Button>
            <Button onClick={() => navigate("/auth")} className="bg-indigo-600 hover:bg-indigo-700">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white"></div>
          
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="max-w-2xl lg:max-w-none">
              <Badge variant="secondary" className="mb-6 rounded-full px-3 py-1 text-sm text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100/80">
                🚀 Welcome to the Future of Libraries
              </Badge>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl xl:text-7xl">
                Make every <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">library seat</span> count.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
                A Supabase-powered library seat platform where live maps, rotating QR codes, server timers, and librarian tools keep desks fair and available.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Account
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="h-12 px-8 text-base bg-white">
                  <Lock className="mr-2 h-5 w-5" />
                  Sign In
                </Button>
              </div>
            </div>
            
            <div className="mt-16 sm:mt-24 lg:mt-0">
              <div className="relative rounded-2xl border border-slate-200/50 bg-white/50 p-2 shadow-2xl backdrop-blur-sm ring-1 ring-slate-900/5">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <MiniPreviewMap />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-24 sm:py-32">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl sm:text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to manage your library</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">No more seat hoarding. Fair access for all students powered by realtime technology.</p>
            </div>
            
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3">
              <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <CardTitle>Live QR Presence</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-slate-600">
                    Desk displays issue short-lived, one-time QR claim links that rotate securely to prevent remote seat hoarding.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <TimerReset className="h-6 w-6" />
                  </div>
                  <CardTitle>Server Timers</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-slate-600">
                    Away and presence deadlines are enforced from backend timestamps. If a student leaves for too long, the seat is automatically released.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <CardTitle>Librarian Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-slate-600">
                    Staff can reset desks, block maintenance seats, view live maps, and inspect historical event trends seamlessly.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-between">
          <div className="flex justify-center space-x-6 lg:order-2">
            <span className="text-sm text-slate-500 hover:text-slate-900 cursor-pointer">Terms</span>
            <span className="text-sm text-slate-500 hover:text-slate-900 cursor-pointer">Privacy</span>
            <span className="text-sm text-slate-500 hover:text-slate-900 cursor-pointer">Contact</span>
          </div>
          <div className="mt-8 lg:order-1 lg:mt-0 flex items-center justify-center lg:justify-start">
            <BookOpen className="h-5 w-5 text-slate-400 mr-2" />
            <p className="text-center text-sm leading-5 text-slate-500">
              &copy; {new Date().getFullYear()} DeskGuard. Making sure every seat belongs to the student using it.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
