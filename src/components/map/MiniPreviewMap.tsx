import { Desk, DeskStatus } from "../../types";
import { FloorMapSvg } from "./FloorMapSvg";

export function MiniPreviewMap() {
  const demo: Desk[] = Array.from({ length: 12 }, (_, index) => ({
    id: String(index),
    code: `preview-${index}`,
    label: `D-${String(index + 1).padStart(2, "0")}`,
    floor: 1,
    zone: index < 4 ? "Quiet" : index < 8 ? "Window" : "Focus",
    x: 10 + (index % 4) * 20,
    y: 18 + Math.floor(index / 4) * 24,
    width: 11,
    height: 8,
    status: (index === 2 ? "occupied" : index === 7 ? "away" : "free") as DeskStatus,
    features: [],
    is_accessible: false,
    current_session_id: null,
    status_changed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return <FloorMapSvg desks={demo} selectedDeskId={null} onSelect={() => undefined} />;
}
