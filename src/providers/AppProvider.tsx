import { useCallback, useEffect, useState, type ReactNode } from "react";
import { type Session as SupabaseSession } from "@supabase/supabase-js";
import { apiRequest } from "../api";
import { supabase } from "../supabaseClient";
import type { AppState } from "../types";
import { GlobalStateContext } from "../contexts/GlobalStateContext";
import { useNavigate, useLocation } from "react-router-dom";

export function AppProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<SupabaseSession | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isStaff = state?.profile?.role === "librarian" || state?.profile?.role === "admin";

  const refreshState = useCallback(async () => {
    const next = await apiRequest<AppState>("/api/state");
    setState(next);
    return next;
  }, []);

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
        if (location.pathname !== "/" && !location.pathname.startsWith("/claim") && !location.pathname.startsWith("/display") && !location.pathname.startsWith("/auth")) {
          navigate("/");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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
      } catch (error: any) {
        setToast(error.message);
      } finally {
        setAction(null);
      }
    },
    []
  );

  return (
    <GlobalStateContext.Provider value={{ state, authSession, isStaff, refreshState, now, runAction, initializing, toast, action }}>
      {children}
    </GlobalStateContext.Provider>
  );
}
