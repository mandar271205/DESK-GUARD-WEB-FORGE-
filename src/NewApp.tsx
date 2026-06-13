import { Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./providers/AppProvider";
import { useGlobalState } from "./contexts/GlobalStateContext";
import { AppShell } from "./components/layout/AppShell";
import { AuthScreen } from "./pages/AuthScreen";
import { LandingPage } from "./pages/LandingPage";
import { DashboardView } from "./pages/DashboardView";
import { MapView } from "./pages/MapView";
import { ClaimPage } from "./pages/ClaimPage";
import { PublicDisplayPage } from "./pages/PublicDisplayPage";
import { DeskInfoPage } from "./pages/DeskInfoPage";
import { SessionView } from "./pages/SessionView";
import { LibrarianOperations } from "./pages/LibrarianOperations";
import { LibrarianAnalytics } from "./pages/LibrarianAnalytics";
import { LibrarianAudit } from "./pages/LibrarianAudit";
import { ResetPasswordScreen } from "./pages/ResetPasswordScreen";
import { Loader2 } from "lucide-react";

import { supabase } from "./supabaseClient";

function ProtectedRoute({ children, staffOnly = false }: { children: React.ReactNode; staffOnly?: boolean }) {
  const { state, isStaff, initializing } = useGlobalState();
  
  if (initializing) return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
  
  if (!state) return <Navigate to="/login" replace />;
  if (staffOnly && !isStaff) return <Navigate to="/app" replace />;
  
  return <>{children}</>;
}

function GlobalAppRouter() {
  const { isStaff } = useGlobalState();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/claim" element={<ClaimPage />} />
      <Route path="/display/:displayPublicId" element={<PublicDisplayPage />} />
      <Route path="/desk/:code" element={<DeskInfoPage />} />

      {/* Protected App Routes inside Shell */}
      <Route path="/app" element={
        <ProtectedRoute>
          <AppShell isStaff={isStaff} onSignOut={() => supabase.auth.signOut()} />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardView />} />
        <Route path="map" element={<MapView />} />
        <Route path="session" element={<SessionView />} />
        
        {/* Librarian only */}
        <Route path="operations" element={
          <ProtectedRoute staffOnly>
            <LibrarianOperations />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute staffOnly>
            <LibrarianAnalytics />
          </ProtectedRoute>
        } />
        <Route path="audit" element={
          <ProtectedRoute staffOnly>
            <LibrarianAudit />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function NewApp() {
  return (
    <AppProvider>
      <GlobalAppRouter />
    </AppProvider>
  );
}
