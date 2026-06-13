import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Armchair, Loader2 } from "lucide-react";

import { useGlobalState } from "../contexts/GlobalStateContext";
import { apiRequest } from "../api";
import type { ClaimPreview, AppState } from "../types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function ClaimPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const navigate = useNavigate();
  const { refreshState, runAction } = useGlobalState();

  
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
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await runAction("Claiming desk", async () => {
        const response = await apiRequest<AppState>("/api/claim", {
          method: "POST",
          body: JSON.stringify({ token })
        });
        await refreshState();
        return response;
      });
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to claim this desk.");
      await apiRequest<ClaimPreview>(`/api/claim/preview?token=${encodeURIComponent(token)}`)
        .then(setPreview)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const statusCopy: Record<ClaimPreview["status"], { title: string; body: string; tone: "success" | "destructive" | "warning" | "default" }> = {
    valid: {
      title: "Ready to claim",
      body: "This live QR token is valid and can be used once.",
      tone: "success"
    },
    invalid: {
      title: "Invalid QR code",
      body: "Please scan the latest live QR code displayed at the desk.",
      tone: "destructive"
    },
    expired: {
      title: "This QR code has expired",
      body: "Please scan the new live QR code displayed at the desk.",
      tone: "warning"
    },
    used: {
      title: "This QR code has already been used",
      body: "Please scan the latest QR code displayed at the desk.",
      tone: "warning"
    },
    revoked: {
      title: "This QR code was refreshed",
      body: "The desk rotation replaced this code. Scan the new one.",
      tone: "warning"
    },
    desk_occupied: {
      title: "Desk is occupied",
      body: "This desk is currently claimed by someone else.",
      tone: "destructive"
    }
  };

  if (!preview && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-600">Verifying live QR code...</p>
        </div>
      </div>
    );
  }

  const copy = preview ? statusCopy[preview.status] : null;

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-slate-200 overflow-hidden">
        {/* Brand header */}
        <div className="bg-indigo-950 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
              <Armchair className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">DeskGuard</span>
          </div>
          <Badge className="bg-white/10 text-indigo-200 border-0 text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Live QR Claim
          </Badge>
        </div>
        <CardHeader className="pb-2 pt-5">
          <CardTitle className="text-xl font-bold text-center">Claim Your Seat</CardTitle>
          <CardDescription className="text-center">QR code scanned and verified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {copy && preview && (
            <div className={`rounded-xl border p-4 ${
              copy.tone === 'success' ? 'bg-emerald-50 border-emerald-200' : 
              copy.tone === 'destructive' ? 'bg-rose-50 border-rose-200' :
              'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {copy.tone === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                ) : copy.tone === 'destructive' ? (
                  <XCircle className="h-5 w-5 text-rose-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                )}
                <div>
                  <h3 className={`text-sm font-bold ${
                    copy.tone === 'success' ? 'text-emerald-900' : 
                    copy.tone === 'destructive' ? 'text-rose-900' :
                    'text-amber-900'
                  }`}>
                    {copy.title}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    copy.tone === 'success' ? 'text-emerald-700' : 
                    copy.tone === 'destructive' ? 'text-rose-700' :
                    'text-amber-700'
                  }`}>
                    {copy.body}
                  </p>
                </div>
              </div>
            </div>
          )}

          {preview?.desk && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 flex-shrink-0">
                  <Armchair className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-extrabold text-slate-900">{preview.desk.label}</p>
                  <p className="text-sm text-slate-500">{preview.desk.zone} · Floor {preview.desk.floor}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">
                  Available
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
            disabled={busy || preview?.status !== "valid"}
            onClick={claim}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {busy ? "Claiming..." : "Confirm & Claim Desk"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-slate-500" onClick={() => navigate("/app/map")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Map
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
