import { Desk } from "../../types";
import { statusMeta } from "../../lib/constants";
import { cn } from "@/lib/utils";

export function FloorMapSvg({
  desks,
  selectedDeskId,
  onSelect
}: {
  desks: Desk[];
  selectedDeskId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-slate-50/50">
      <svg viewBox="0 0 100 100" role="img" aria-label="Library floor map" className="aspect-[4/3] w-full">
        <rect x="0" y="0" width="100" height="100" fill="transparent" />
        <path d="M4 8h92v84H4z" fill="none" stroke="#e2e8f0" strokeWidth="0.7" />
        <path d="M50 8v84M4 50h92" stroke="#f1f5f9" strokeWidth="0.6" />
        <rect x="7" y="6" width="20" height="4" rx="1" fill="#e2e8f0" />
        <rect x="73" y="90" width="18" height="4" rx="1" fill="#e2e8f0" />
        <text x="8" y="9" fontSize="2.5" fill="#64748b">
          stacks
        </text>
        <text x="75" y="93" fontSize="2.5" fill="#64748b">
          exit
        </text>
        {desks.map((desk) => {
          const meta = statusMeta[desk.status];
          const selected = selectedDeskId === desk.id;
          return (
            <g
              key={desk.id}
              role="button"
              tabIndex={0}
              aria-label={`${desk.label} ${meta.label}`}
              onClick={() => onSelect(desk.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(desk.id);
              }}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:opacity-80 outline-none focus:ring-2 focus:ring-indigo-500 rounded",
                ["away", "abandoned"].includes(desk.status) && "desk-pulse"
              )}
            >
              <rect
                x={desk.x}
                y={desk.y}
                width={desk.width}
                height={desk.height}
                rx="1.4"
                fill={meta.fill}
                stroke={selected ? "#312e81" : meta.stroke}
                strokeWidth={selected ? 1.6 : 0.8}
                className="transition-colors duration-300"
              />
              <rect x={desk.x + 1} y={desk.y + 1} width={desk.width - 2} height="1.2" rx="0.6" fill="rgba(255,255,255,0.3)" />
              <text
                x={desk.x + desk.width / 2}
                y={desk.y + desk.height / 2 + 0.9}
                textAnchor="middle"
                fontSize="2.25"
                fontWeight="600"
                fill="#ffffff"
                className="select-none pointer-events-none"
              >
                {desk.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
