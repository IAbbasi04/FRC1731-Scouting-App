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

const FIELD_W = 1000;
const FIELD_H = 520;

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function AutoStartField({ alliance, position, onAllianceChange, onPositionChange }: Props) {
  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onPositionChange({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    });
  }

  const isRed = alliance === "red";
  const allianceFill = isRed ? "#8f2530" : "#173f8f";
  const allianceSoft = isRed ? "#5c1d26" : "#132f69";
  const allianceLine = isRed ? "#fb7185" : "#60a5fa";

  return (
    <section className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#ffd84d]">Auto start position</h2>
          <p className="mt-1 text-sm text-slate-500">2026 half-field view. Choose alliance, then click or drag the robot to its starting spot.</p>
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
          className="relative touch-none select-none overflow-hidden rounded-xl border border-slate-700/80 bg-[#0b1422]"
          style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}
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
          <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="absolute inset-0 h-full w-full" aria-label="2026 REBUILT alliance half field">
            <rect x="0" y="0" width="1000" height="520" fill="#202a39" />

            {/* Alliance area behind driver stations */}
            <rect x="0" y="0" width="120" height="520" fill={allianceSoft} opacity="0.9" />
            <rect x="120" y="28" width="78" height="464" fill="#111827" stroke="#cbd5e1" strokeWidth="4" />
            <line x1="198" y1="28" x2="198" y2="492" stroke="#f8fafc" strokeWidth="3" />
            <text x="72" y="260" fill="#f8fafc" fontSize="23" fontWeight="700" textAnchor="middle" transform="rotate(-90 72 260)">ALLIANCE AREA</text>
            <text x="154" y="260" fill="#e2e8f0" fontSize="18" fontWeight="700" textAnchor="middle" transform="rotate(-90 154 260)">DRIVER STATIONS</text>

            {/* Outpost zones */}
            <rect x="0" y="0" width="198" height="92" fill={allianceFill} stroke={allianceLine} strokeWidth="3" />
            <rect x="0" y="428" width="198" height="92" fill={allianceFill} stroke={allianceLine} strokeWidth="3" />
            <text x="88" y="52" fill="#fff" fontSize="17" fontWeight="700" textAnchor="middle">OUTPOST</text>
            <text x="88" y="479" fill="#fff" fontSize="17" fontWeight="700" textAnchor="middle">OUTPOST</text>

            {/* Alliance zone */}
            <rect x="198" y="28" width="470" height="464" fill={allianceFill} opacity="0.35" />
            <text x="350" y="266" fill={allianceLine} fontSize="26" fontWeight="800" textAnchor="middle" transform="rotate(-90 350 266)">ALLIANCE ZONE</text>

            {/* Depot */}
            <rect x="214" y="70" width="54" height="62" rx="4" fill="#eab308" stroke="#fef08a" strokeWidth="3" />
            <circle cx="228" cy="84" r="5" fill="#fde047" />
            <circle cx="244" cy="84" r="5" fill="#fde047" />
            <circle cx="260" cy="84" r="5" fill="#fde047" />
            <circle cx="228" cy="101" r="5" fill="#fde047" />
            <circle cx="244" cy="101" r="5" fill="#fde047" />
            <circle cx="260" cy="101" r="5" fill="#fde047" />
            <text x="289" y="104" fill="#f8fafc" fontSize="16" fontWeight="700">DEPOT</text>

            {/* Tower */}
            <g>
              <rect x="238" y="202" width="48" height="116" fill="#cbd5e1" opacity="0.15" stroke="#e2e8f0" strokeWidth="3" />
              <line x1="250" y1="214" x2="250" y2="306" stroke="#cbd5e1" strokeWidth="5" />
              <line x1="274" y1="214" x2="274" y2="306" stroke="#cbd5e1" strokeWidth="5" />
              <line x1="248" y1="236" x2="276" y2="236" stroke="#ffd84d" strokeWidth="4" />
              <line x1="248" y1="262" x2="276" y2="262" stroke="#ffd84d" strokeWidth="4" />
              <line x1="248" y1="288" x2="276" y2="288" stroke="#ffd84d" strokeWidth="4" />
              <text x="304" y="266" fill="#f8fafc" fontSize="17" fontWeight="700">TOWER</text>
            </g>

            {/* Human starting line */}
            <line x1="198" y1="28" x2="198" y2="492" stroke="#f8fafc" strokeWidth="2" strokeDasharray="10 8" opacity="0.8" />

            {/* Robot starting line */}
            <line x1="622" y1="28" x2="622" y2="492" stroke="#f8fafc" strokeWidth="5" opacity="0.9" />
            <text x="608" y="260" fill="#f8fafc" fontSize="17" fontWeight="700" textAnchor="middle" transform="rotate(-90 608 260)">ROBOT STARTING LINE</text>

            {/* Trenches */}
            <g fill="#0f172a" stroke={allianceLine} strokeWidth="4">
              <rect x="606" y="28" width="38" height="108" />
              <rect x="606" y="384" width="38" height="108" />
            </g>
            <text x="625" y="82" fill="#f8fafc" fontSize="13" fontWeight="700" textAnchor="middle" transform="rotate(-90 625 82)">TRENCH</text>
            <text x="625" y="438" fill="#f8fafc" fontSize="13" fontWeight="700" textAnchor="middle" transform="rotate(-90 625 438)">TRENCH</text>

            {/* Bumps */}
            <g fill={allianceFill} stroke={allianceLine} strokeWidth="3">
              <path d="M 530 136 L 644 136 L 644 208 L 530 208 L 510 190 L 510 154 Z" />
              <path d="M 530 312 L 644 312 L 644 384 L 530 384 L 510 366 L 510 330 Z" />
            </g>
            <text x="566" y="177" fill="#fff" fontSize="15" fontWeight="800" textAnchor="middle">BUMP</text>
            <text x="566" y="353" fill="#fff" fontSize="15" fontWeight="800" textAnchor="middle">BUMP</text>

            {/* Hub */}
            <g>
              <rect x="510" y="208" width="134" height="104" fill="#e5e7eb" stroke="#f8fafc" strokeWidth="4" />
              <polygon points="525,260 545,220 609,220 629,260 609,300 545,300" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
              <circle cx="577" cy="260" r="32" fill={allianceFill} stroke={allianceLine} strokeWidth="4" />
              <text x="577" y="267" fill="#fff" fontSize="19" fontWeight="900" textAnchor="middle">HUB</text>
            </g>

            {/* Neutral-zone half */}
            <rect x="668" y="28" width="332" height="464" fill="#7c7420" opacity="0.34" />
            <text x="834" y="474" fill="#fef3c7" fontSize="22" fontWeight="800" textAnchor="middle">NEUTRAL ZONE</text>
            <line x1="1000" y1="28" x2="1000" y2="492" stroke="#f8fafc" strokeWidth="6" />
            <text x="982" y="260" fill="#f8fafc" fontSize="17" fontWeight="700" textAnchor="middle" transform="rotate(-90 982 260)">CENTER LINE</text>

            {/* Fuel cluster near center */}
            {Array.from({ length: 8 }).map((_, col) =>
              Array.from({ length: 10 }).map((__, row) => (
                <circle key={`${col}-${row}`} cx={742 + col * 21} cy={158 + row * 21} r="6" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              )),
            )}

            {/* Perimeter and labels */}
            <rect x="198" y="28" width="802" height="464" fill="none" stroke="#e2e8f0" strokeWidth="5" />
            <text x="405" y="50" fill="#cbd5e1" fontSize="13" fontWeight="700">YOUR ALLIANCE HALF</text>
            <text x="820" y="50" fill="#cbd5e1" fontSize="13" fontWeight="700">TO FIELD CENTER</text>
          </svg>

          <div
            className={`absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-2 border-white shadow-xl ${isRed ? "bg-red-500 shadow-red-950/60" : "bg-blue-500 shadow-blue-950/60"}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            aria-label={`Robot start at ${position.x.toFixed(0)} percent across, ${position.y.toFixed(0)} percent down`}
          >
            <Bot size={21} className="text-white" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Alliance-relative half field: driver stations left, center line right.</span>
          <span className="font-mono text-slate-400">x {position.x.toFixed(1)}% · y {position.y.toFixed(1)}%</span>
        </div>
      </div>
    </section>
  );
}
