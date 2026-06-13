import { useParams, useNavigate } from "react-router-dom";
import { Accessibility, AlertTriangle, Circle, Map } from "lucide-react";
import { useGlobalState } from "../contexts/GlobalStateContext";
import { statusMeta } from "../lib/constants";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function NotFoundScreen({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-4 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{label}</h2>
      <Button onClick={() => navigate("/app")} className="mt-6">
        <Map className="mr-2 h-4 w-4" />
        Back to App
      </Button>
    </div>
  );
}

export function DeskInfoPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { state } = useGlobalState();

  if (!state) return <NotFoundScreen label="Loading..." />;

  const desk = state.desks.find((item) => item.code.toLowerCase() === code?.toLowerCase());

  if (!desk) {
    return <NotFoundScreen label="Desk not found" />;
  }

  const meta = statusMeta[desk.status];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div>
            <CardDescription className="text-sm font-medium text-slate-500 uppercase tracking-wider">Static Desk Label</CardDescription>
            <CardTitle className="text-4xl font-extrabold tracking-tight text-slate-900 mt-2">{desk.label}</CardTitle>
            <p className="mt-2 text-slate-600 font-medium">
              {desk.zone} • Floor {desk.floor} • {desk.code}
            </p>
          </div>
          <Badge className={`${meta.bg} ${meta.text} border-${meta.stroke} px-3 py-1.5 text-sm`}>
            {meta.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="mt-4 flex flex-wrap gap-2">
            {desk.is_accessible && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                <Accessibility className="mr-1.5 h-3.5 w-3.5" />
                Accessible
              </Badge>
            )}
            {desk.features.map((feature) => (
              <Badge key={feature} variant="outline" className="text-slate-600">
                <Circle className="mr-1.5 h-3 w-3 fill-slate-300" />
                {feature}
              </Badge>
            ))}
          </div>

          <Alert className="mt-8 border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-lg font-semibold text-amber-900">Live QR Required</AlertTitle>
            <AlertDescription className="mt-2 text-sm leading-6 text-amber-800">
              This static page identifies the desk and shows availability, but it cannot claim the seat. Scan the live rotating QR code displayed at the desk or kiosk to claim it.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => navigate("/app/map")}
            className="mt-8 bg-indigo-600 hover:bg-indigo-700 shadow-md"
            size="lg"
          >
            <Map className="mr-2 h-5 w-5" />
            Browse Available Desks
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
