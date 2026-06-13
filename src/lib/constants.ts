import { DeskStatus } from "../types";

export const statusOrder: DeskStatus[] = ["free", "occupied", "away", "abandoned", "unavailable"];

export const statusMeta: Record<
  DeskStatus,
  {
    label: string;
    fill: string;
    stroke: string;
    bg: string;
    text: string;
    badge: string;
  }
> = {
  free: {
    label: "Free",
    fill: "#10b981", // Emerald 500 (shadcn friendly)
    stroke: "#059669", // Emerald 600
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  occupied: {
    label: "Occupied",
    fill: "#ef4444", // Red 500
    stroke: "#dc2626", // Red 600
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-50 text-red-700 border-red-200"
  },
  away: {
    label: "Away",
    fill: "#f59e0b", // Amber 500
    stroke: "#d97706", // Amber 600
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200"
  },
  abandoned: {
    label: "Abandoned",
    fill: "#f97316", // Orange 500
    stroke: "#ea580c", // Orange 600
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-50 text-orange-700 border-orange-200"
  },
  unavailable: {
    label: "Unavailable",
    fill: "#94a3b8", // Slate 400
    stroke: "#64748b", // Slate 500
    bg: "bg-slate-50",
    text: "text-slate-700",
    badge: "bg-slate-50 text-slate-700 border-slate-200"
  }
};

export function actionLabel(action: string) {
  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Ai", "AI");
}
