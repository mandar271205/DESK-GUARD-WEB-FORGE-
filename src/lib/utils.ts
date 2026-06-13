import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Desk, QRDisplay } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function displayPublicIdForDesk(deskId: string, displays: QRDisplay[]) {
  return displays.find((d) => d.desk_id === deskId)?.display_public_id || null;
}

export function extractClaimToken(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("token");
  } catch {
    return null;
  }
}
