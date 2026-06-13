import { createContext, useContext } from "react";
import type { AppState, SessionRecord } from "../types";

export interface GlobalState {
  state: AppState | null;
  authSession: any;
  isStaff: boolean;
  refreshState: () => Promise<AppState>;
  now: number;
  initializing: boolean;
  toast: string | null;
  action: string | null;
  runAction: (label: string, callback: () => Promise<AppState | { state: AppState }>) => Promise<void>;
}

export const GlobalStateContext = createContext<GlobalState | null>(null);

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
}
