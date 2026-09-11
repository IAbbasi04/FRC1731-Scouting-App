"use client";

import type { PointerEvent } from "react";
import { Bot } from "lucide-react";
import type { AllianceColor, FieldPoint } from "@/types/scouting";

type Props = {
  alliance: AllianceColor;
  position: FieldPoint;
  onAllianceChange: (alliance: AllianceColor) => void;
  onPositionChange: (position: FieldPoint) => void;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function AutoStartField({ alliance, position, onAllianceChange, onPositionChange }: Props) {
  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
    onPositionChange({ x, y });
  }

  const allianceClass = alliance === "red" ? "bg-red-500" : "bg-blue-500";
  const opponentClass = alliance === "red" ? "bg-blue-500" : "bg-red-500";

  return (
    <section className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#ffd84d]">Auto start position</h2>
          <p className="mt-1 text-sm text-slate-500">Choose the alliance, then click or drag the robot to its starting location.</p>
        </div>
        <div className="inline-flex rounded-xl border border-blue-300/15 bg-[#0d1b2e] p-1">
          {(["red", "blue"] as const).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onAllianceChange(color)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${alliance === color ? (color === "red" ? "bg-red-500 text-white" : "bg-blue-500 text-white") : "text-slate-400 hover:text-white"}`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-blue-300/15 bg-[#0a1525] p-3">
        <div
          className="relative aspect-[2/1] touch-none select-none overflow-hidden rounded-xl border border-slate-700/80 bg-[#11243d]"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
        >
          <div className={`absolute inset-y-0 left-0 w-[9%] opacity-75 ${allianceClass}`} />
          <div className={`absolute inset-y-0 right-0 w-[9%] opacity-75 ${opponentClass}`} />
          <div className="absolute inset-y-0 left-[9%] w-px bg-white/20" />
          <div className="absolute inset-y-0 right-[9%] w-px bg-white/20" />
          <div className="absolute inset-y-[7%] left-1/2 w-px -translate-x-1/2 bg-white/20" />
          <div className="absolute left-1/2 top-1/2 h-[26%] w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-[#ffd84d]/60 bg-[#ffd84d]/10" title="Hub" />
          <div className="absolute left-[18%] top-[18%] h-[18%] w-[8%] rounded-lg border border-slate-400/50 bg-slate-400/10" title="Tower / obstacle area" />
          <div className="absolute bottom-[18%] left-[18%] h-[18%] w-[8%] rounded-lg border border-slate-400/50 bg-slate-400/10" />
          <div className="absolute right-[18%] top-[18%] h-[18%] w-[8%] rounded-lg border border-slate-400/50 bg-slate-400/10" />
          <div className="absolute bottom-[18%] right-[18%] h-[18%] w-[8%] rounded-lg border border-slate-400/50 bg-slate-400/10" />
          <div className="absolute inset-x-[28%] top-[12%] h-px border-t border-dashed border-slate-500/50" />
          <div className="absolute inset-x-[28%] bottom-[12%] h-px border-t border-dashed border-slate-500/50" />
          <div className="absolute left-3 top-3 rounded-md bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">Your alliance wall</div>
          <div className="absolute right-3 top-3 rounded-md bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">Opponent wall</div>

          <div
            className={`absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-2 border-white shadow-lg ${alliance === "red" ? "bg-red-500 shadow-red-950/50" : "bg-blue-500 shadow-blue-950/50"}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            aria-label={`Robot start at ${position.x.toFixed(0)} percent across, ${position.y.toFixed(0)} percent down`}
          >
            <Bot size={23} className="text-white" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Alliance-relative map: your driver station is always on the left.</span>
          <span className="font-mono text-slate-400">x {position.x.toFixed(1)}% · y {position.y.toFixed(1)}%</span>
        </div>
      </div>
    </section>
  );
}
