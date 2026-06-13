import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DoorOpen, Home, Eye, EyeOff, Mail, QrCode, ShieldCheck, Clock3, Wifi, UserPlus, Loader2, Map, BookOpen } from "lucide-react";
import { supabase } from "../supabaseClient";
import { getPublicAppUrl } from "../lib/app-url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export function AuthScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/app";

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
      else navigate(redirectTo, { replace: true });
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(mapAuthError(signInError.message));
      else navigate(redirectTo, { replace: true });
    }

    setBusy(false);
  };

  const forgotPassword = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email first to reset your password.");
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !busy) void submit();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1fr_1fr]">
        <section className="bg-indigo-950 p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.2),transparent_70%)]"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">DeskGuard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-white leading-tight">Your smart library<br />access portal.</h1>
            <p className="text-sm leading-relaxed text-indigo-200/70">
              Public signup creates student accounts. Librarian access requires admin approval for security.
            </p>
            <div className="mt-8 flex flex-col gap-2.5">
              <button
                onClick={() => navigate("/app/map")}
                className="flex items-center gap-2 text-sm text-indigo-300 hover:text-white transition-colors"
              >
                <Map className="h-4 w-4" />
                View live map without signing in
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-sm text-indigo-300 hover:text-white transition-colors"
              >
                <Home className="h-4 w-4" />
                Back to home
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-indigo-900/50 p-4 border border-indigo-800/50 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-300">QR tokens</span>
                <QrCode className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-xl font-semibold text-white">One use</p>
            </div>
            <div className="rounded-xl bg-indigo-900/50 p-4 border border-indigo-800/50 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-300">QR expiry</span>
                <Clock3 className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-xl font-semibold text-white">35s</p>
            </div>
            <div className="rounded-xl bg-indigo-900/50 p-4 border border-indigo-800/50 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-300">Role source</span>
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-xl font-semibold text-white">Server</p>
            </div>
            <div className="rounded-xl bg-indigo-900/50 p-4 border border-indigo-800/50 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-300">Realtime</span>
                <Wifi className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-xl font-semibold text-white">Live</p>
            </div>
          </div>
        </section>

        <section className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-900">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "signin" ? "Sign in to manage your desk session." : "Get started with DeskGuard for free."}
            </p>
          </div>
          <Tabs defaultValue="signin" onValueChange={(v) => setMode(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@university.edu" autoComplete="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {message && (
                <Alert className="mt-4 border-teal-200 bg-teal-50 text-teal-800">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={submit}
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!busy && mode === "signin" && <DoorOpen className="mr-2 h-4 w-4" />}
                {!busy && mode === "signup" && <UserPlus className="mr-2 h-4 w-4" />}
                {busy ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
              </Button>

              {mode === "signin" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={forgotPassword}
                  disabled={busy}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Forgot password
                </Button>
              )}
            </div>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
