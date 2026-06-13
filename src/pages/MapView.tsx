import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ScanLine, Accessibility, Circle, QrCode, ArrowRight } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { statusMeta } from "../lib/constants";
import { displayPublicIdForDesk, extractClaimToken } from "../lib/utils";
import { FloorMapSvg } from "../components/map/FloorMapSvg";
import type { DeskStatus, Desk } from "../types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const statusOrder: DeskStatus[] = ["free", "away", "occupied", "abandoned", "unavailable"];

export function MapView() {
  const navigate = useNavigate();
  const { state, isStaff, action } = useGlobalState();

  const [floor, setFloor] = useState<string>("all");
  const [zone, setZone] = useState<string>("all");
  const [status, setStatus] = useState<DeskStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  if (!state) return null;

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
  const activeDesk = state.activeSession ? state.desks.find(d => d.id === state.activeSession?.desk_id) || null : null;
  const qrDisplayId = selectedDesk ? displayPublicIdForDesk(selectedDesk.id, state.qrDisplays) : null;
  const canGenerateDeskQr = Boolean(selectedDesk && selectedDesk.status === "free" && !activeDesk && !action);

  const handleScannedClaim = useCallback((value: string) => {
    const token = extractClaimToken(value);
    if (token) {
      navigate(`/claim?token=${encodeURIComponent(token)}`);
    }
  }, [navigate]);

  useEffect(() => {
    if (!scannerOpen) return;

    let scanner: any;
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
          (decoded: string) => {
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
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Desk, code, or zone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Floor</Label>
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger>
                  <SelectValue placeholder="All floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All floors</SelectItem>
                  {floors.map((item) => (
                    <SelectItem key={item} value={String(item)}>Floor {item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zone</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger>
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zones</SelectItem>
                  {zones.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as DeskStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOrder.map((item) => (
                    <SelectItem key={item} value={item}>{statusMeta[item].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map and Sidebar Grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Main Map */}
        <Card className="shadow-sm border-slate-200 min-h-[500px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <CardTitle className="text-lg">Live Floor Map</CardTitle>
              <CardDescription>{filtered.length} desks visible</CardDescription>
            </div>
            {/* Status Legend */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-slate-200"></div>Free</div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-rose-500"></div>Occupied</div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-amber-400"></div>Away</div>
              <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-orange-500"></div>Abandoned</div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
             <div className="w-full h-full max-h-[600px] p-4 flex items-center justify-center">
              <FloorMapSvg desks={filtered} selectedDeskId={selectedDesk?.id ?? null} onSelect={setSelectedDeskId} />
             </div>
          </CardContent>
        </Card>

        {/* Selected Desk Panel */}
        <Card className="shadow-sm border-slate-200 h-fit">
          <CardHeader className="pb-4">
            <CardDescription className="uppercase tracking-wider font-semibold text-xs">Selected Desk</CardDescription>
            {selectedDesk ? (
              <div className="flex items-start justify-between mt-1">
                <div>
                  <CardTitle className="text-3xl font-extrabold">{selectedDesk.label}</CardTitle>
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedDesk.zone} • Floor {selectedDesk.floor}</p>
                </div>
                <Badge className={`${statusMeta[selectedDesk.status].bg} ${statusMeta[selectedDesk.status].text} border-${statusMeta[selectedDesk.status].stroke}`}>
                  {statusMeta[selectedDesk.status].label}
                </Badge>
              </div>
            ) : (
              <CardTitle className="text-xl text-slate-400 mt-1">None selected</CardTitle>
            )}
          </CardHeader>

          {selectedDesk && (
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-slate-50 text-slate-600">
                  <ScanLine className="mr-1.5 h-3 w-3" />
                  {selectedDesk.code}
                </Badge>
                {selectedDesk.is_accessible && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600">
                    <Accessibility className="mr-1.5 h-3 w-3" />
                    Accessible
                  </Badge>
                )}
                {selectedDesk.features.map((f) => (
                  <Badge key={f} variant="outline" className="bg-slate-50 text-slate-600">
                    <Circle className="mr-1.5 h-3 w-3 fill-slate-300" />
                    {f}
                  </Badge>
                ))}
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-3">
                <QrCode className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-900">Live QR Required</h4>
                  <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
                    Secure claiming requires scanning the live rotating QR code at the desk or kiosk.
                  </p>
                </div>
              </div>

              {!isStaff && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                    disabled={!canGenerateDeskQr}
                    onClick={() => navigate(`/display/${qrDisplayId}`)}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    {activeDesk ? "Active desk already claimed" : selectedDesk.status === "free" ? "Generate QR display" : "Desk not free"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={Boolean(activeDesk)}
                    onClick={() => setScannerOpen((open) => !open)}
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    {scannerOpen ? "Close scanner" : "Camera scan"}
                  </Button>

                  {activeDesk && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 text-center">
                      Active desk: <span className="font-semibold">{activeDesk.label}</span>
                    </div>
                  )}

                  {scannerOpen && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                      <div id="deskguard-qr-reader" className="w-full" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
