import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCcw, WifiOff, AlertTriangle } from "lucide-react";
import { getPublicAppUrl } from "../lib/app-url";
import { useGlobalState } from "../contexts/GlobalStateContext";
import type { IssuedQR } from "../types";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function secondsUntil(iso: string | null | undefined, now: number) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
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

  return (
    <Card className={`mx-auto max-w-sm ${kiosk ? 'border-none shadow-none bg-transparent' : 'shadow-lg border-slate-200'}`}>
      <CardHeader className="text-center pb-2">
        <CardTitle className={`text-2xl font-bold tracking-tight ${kiosk ? 'text-white' : 'text-slate-900'}`}>
          Live Desk QR
        </CardTitle>
        <p className={`text-sm ${kiosk ? 'text-slate-400' : 'text-slate-500'}`}>{modeLabel}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {!online && (
          <Alert variant="destructive" className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Offline</AlertTitle>
            <AlertDescription>Cannot rotate QR code. Connect to the internet.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className={`relative flex aspect-square w-full max-w-[280px] items-center justify-center rounded-2xl bg-white p-6 ${!kiosk && 'shadow-inner border border-slate-100'}`}>
          {issued ? (
            <div className={loading ? "opacity-40 transition-opacity duration-300" : "opacity-100 transition-opacity duration-300"}>
              <QRCodeSVG
                value={issued.claim_url}
                size={220}
                level="H"
                includeMargin={false}
                fgColor="#0f172a"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-2xl">
              <RefreshCcw className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          )}
        </div>

        {issued && (
          <div className="mt-6 flex w-full flex-col items-center">
            <div className="flex w-full items-center justify-between text-sm">
              <span className={kiosk ? 'text-slate-400' : 'text-slate-500'}>Refreshes in</span>
              <span className={`font-mono font-bold ${remaining <= 5 ? (kiosk ? 'text-rose-400' : 'text-rose-600') : (kiosk ? 'text-indigo-300' : 'text-indigo-600')}`}>
                {remaining}s
              </span>
            </div>
            <div className={`mt-2 h-2 w-full overflow-hidden rounded-full ${kiosk ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className={`h-full transition-all duration-1000 ease-linear ${remaining <= 5 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.max(0, (remaining / issued.rotation_seconds) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center pt-2">
        <Button
          variant={kiosk ? "outline" : "secondary"}
          onClick={() => void refresh()}
          disabled={loading || !online}
          className={kiosk ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white' : ''}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading && "animate-spin"}`} />
          Force Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PublicDisplayPage() {
  const { displayPublicId } = useParams<{ displayPublicId: string }>();
  const { now } = useGlobalState();
  const isIframe = new URLSearchParams(window.location.search).get("iframe") === "1";

  const issue = useCallback(async () => {
    if (!displayPublicId) throw new Error("No display ID.");
    const params = new URLSearchParams({ baseUrl: getPublicAppUrl() });
    const response = await fetch(`/api/display/${encodeURIComponent(displayPublicId)}/issue-qr?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error ?? "Unable to issue QR.");
    return payload as IssuedQR;
  }, [displayPublicId]);

  const publicUrl = getPublicAppUrl();
  const isInvalidProdConfig = import.meta.env.PROD && (publicUrl.includes("localhost") || publicUrl.includes("192.168."));

  return (
    <div className={`bg-slate-950 flex flex-col items-center justify-center ${isIframe ? 'min-h-0 p-2' : 'min-h-screen p-4 sm:p-8'}`}>
      {!isIframe && isInvalidProdConfig && (
        <Alert className="mx-auto mb-8 max-w-xl border-amber-500/50 bg-amber-500/10 text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <AlertTitle>Production QR configuration is invalid</AlertTitle>
          <AlertDescription>
            Set VITE_PUBLIC_APP_URL to the deployed HTTPS domain to generate valid QR links.
          </AlertDescription>
        </Alert>
      )}
      <LiveDeskQRCode
        now={now}
        kiosk
        modeLabel={isIframe ? "Point camera to claim desk" : "Public Kiosk Display"}
        issue={issue}
      />
    </div>
  );
}
