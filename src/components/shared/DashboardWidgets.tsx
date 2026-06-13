import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricTile({
  icon: Icon,
  label,
  value,
  tone = "light",
  trend
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "light" | "dark" | "primary" | "destructive" | "warning";
  trend?: string;
}) {
  const styles = {
    light: "bg-white border-slate-200 text-slate-900",
    dark: "bg-slate-900 border-slate-800 text-white",
    primary: "bg-indigo-50 border-indigo-100 text-indigo-900",
    destructive: "bg-rose-50 border-rose-100 text-rose-900",
    warning: "bg-amber-50 border-amber-100 text-amber-900"
  };

  const iconStyles = {
    light: "text-slate-500",
    dark: "text-slate-400",
    primary: "text-indigo-600",
    destructive: "text-rose-600",
    warning: "text-amber-600"
  };

  const labelStyles = {
    light: "text-slate-500",
    dark: "text-slate-400",
    primary: "text-indigo-600/80",
    destructive: "text-rose-600/80",
    warning: "text-amber-600/80"
  };

  return (
    <Card className={cn("overflow-hidden shadow-sm", styles[tone])}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className={cn("text-sm font-medium tracking-wide", labelStyles[tone])}>{label}</p>
          <div className={cn("rounded-md p-2 bg-white/50 backdrop-blur", iconStyles[tone])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && <span className="text-xs font-medium text-slate-500">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) return "00:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CountdownRing({ seconds, total, large = false }: { seconds: number; total: number; large?: boolean }) {
  const radius = large ? 58 : 46;
  const size = large ? 150 : 126;
  const stroke = large ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;

  return (
    <div className="flex items-center justify-center p-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Countdown">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={seconds <= 15 ? "#f43f5e" : "#6366f1"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - circumference * progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-1000 ease-linear"
        />
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize={large ? 28 : 22} fontWeight="800" fill="#0f172a" className="font-mono">
          {formatDuration(seconds)}
        </text>
        <text x="50%" y="64%" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#64748b" className="uppercase tracking-wider">
          remaining
        </text>
      </svg>
    </div>
  );
}
