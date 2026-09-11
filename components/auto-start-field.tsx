"use client";

import type { ChangeEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Bot, ImagePlus, RotateCcw } from "lucide-react";
import type { AllianceColor, FieldPoint } from "@/types/scouting";

type Props = {
  alliance: AllianceColor;
  position: FieldPoint;
  onAllianceChange: (alliance: AllianceColor) => void;
  onPositionChange: (position: FieldPoint) => void;
};

const FIELD_W = 1000;
const FIELD_H = 520;
const IMAGE_STORAGE_KEY = "1731.2026-half-field-background.v1";
const MAX_STORED_IMAGE_BYTES = 3_500_000;

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function AutoStartField({ alliance, position, onAllianceChange, onPositionChange }: Props) {
  const [fieldImage, setFieldImage] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setFieldImage(window.localStorage.getItem(IMAGE_STORAGE_KEY));
    } catch {
      // The map remains usable with the vector fallback if local storage is unavailable.
    }
  }, []);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    onPositionChange({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    });
  }

  function loadFieldImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageMessage("Choose a PNG, JPG, WEBP, or other image file.");
      return;
    }

    if (file.size > MAX_STORED_IMAGE_BYTES) {
      setImageMessage("That image is too large to store locally. Use a crop or compressed image under about 3.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      try {
        window.localStorage.setItem(IMAGE_STORAGE_KEY, reader.result);
        setFieldImage(reader.result);
        setImageMessage("Official field background saved on this device.");
      } catch {
        setImageMessage("This browser could not store the image. Try a smaller crop or compressed image.");
      }
    };
    reader.readAsDataURL(file);
  }

  function clearFieldImage() {
    try {
      window.localStorage.removeItem(IMAGE_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures and still clear the current view.
    }
    setFieldImage(null);
    setImageMessage("Using the built-in vector fallback.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isRed = alliance === "red";
  const allianceFill = isRed ? "#8f2530" : "#173f8f";
  const allianceSoft = isRed ? "#5c1d26" : "#132f69";
  const allianceLine = isRed ? "#fb7185" : "#60a5fa";

  return (
    <section className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#ffd84d]">Auto start position</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Use an official top-down half-field image for exact geometry, then click or drag the robot to its starting spot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <input ref={fileInputRef} type="file" accept="image/*" onChange={loadFieldImage} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-blue-300/20 bg-[#0d1b2e] px-3 py-2 text-sm font-medium text-slate-200 hover:border-[#ffd84d]/50">
            <ImagePlus size={16} /> {fieldImage ? "Replace field image" : "Load official field image"}
          </button>
          {fieldImage ? (
            <button type="button" onClick={clearFieldImage} className="inline-flex items-center gap-2 rounded-xl border border-blue-300/15 px-3 py-2 text-sm text-slate-400 hover:text-white">
              <RotateCcw size={15} /> Reset
            </button>
          ) : null}
        </div>
      </div>

      {imageMessage ? <p className="mt-3 text-xs text-slate-400">{imageMessage}</p> : null}

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
          {fieldImage ? (
            <img src={fieldImage} alt="Official 2026 REBUILT half-field reference loaded by the user" className="pointer-events-none absolute inset-0 h-full w-full object-fill" draggable={false} />
          ) : (
            <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="absolute inset-0 h-full w-full" aria-label="2026 REBUILT alliance half-field fallback">
              <rect x="0" y="0" width="1000" height="520" fill="#202a39" />
              <rect x="0" y="0" width="120" height="520" fill={allianceSoft} opacity="0.9" />
              <rect x="120" y="28" width="78" height="464" fill="#111827" stroke="#cbd5e1" strokeWidth="4" />
              <line x1="198" y1="28" x2="198" y2="492" stroke="#f8fafc" strokeWidth="3" />
              <rect x="0" y="0" width="198" height="92" fill={allianceFill} stroke={allianceLine} strokeWidth="3" />
              <rect x="0" y="428" width="198" height="92" fill={allianceFill} stroke={allianceLine} strokeWidth="3" />
              <rect x="198" y="28" width="470" height="464" fill={allianceFill} opacity="0.35" />
              <rect x="214" y="70" width="54" height="62" rx="4" fill="#eab308" stroke="#fef08a" strokeWidth="3" />
              <rect x="238" y="202" width="48" height="116" fill="#cbd5e1" opacity="0.15" stroke="#e2e8f0" strokeWidth="3" />
              <line x1="622" y1="28" x2="622" y2="492" stroke="#f8fafc" strokeWidth="5" opacity="0.9" />
              <g fill="#0f172a" stroke={allianceLine} strokeWidth="4">
                <rect x="606" y="28" width="38" height="108" />
                <rect x="606" y="384" width="38" height="108" />
              </g>
              <g fill={allianceFill} stroke={allianceLine} strokeWidth="3">
                <path d="M 530 136 L 644 136 L 644 208 L 530 208 L 510 190 L 510 154 Z" />
                <path d="M 530 312 L 644 312 L 644 384 L 530 384 L 510 366 L 510 330 Z" />
              </g>
              <rect x="510" y="208" width="134" height="104" fill="#e5e7eb" stroke="#f8fafc" strokeWidth="4" />
              <circle cx="577" cy="260" r="32" fill={allianceFill} stroke={allianceLine} strokeWidth="4" />
              <text x="577" y="267" fill="#fff" fontSize="19" fontWeight="900" textAnchor="middle">HUB</text>
              <rect x="668" y="28" width="332" height="464" fill="#7c7420" opacity="0.34" />
              <line x1="1000" y1="28" x2="1000" y2="492" stroke="#f8fafc" strokeWidth="6" />
              <rect x="198" y="28" width="802" height="464" fill="none" stroke="#e2e8f0" strokeWidth="5" />
              <text x="340" y="255" fill="#cbd5e1" fontSize="24" fontWeight="800" textAnchor="middle">VECTOR FALLBACK</text>
              <text x="340" y="285" fill="#94a3b8" fontSize="15" fontWeight="600" textAnchor="middle">Load an official top-down half-field image for exact proportions</text>
            </svg>
          )}

          <div
            className={`absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-2 border-white shadow-xl ${isRed ? "bg-red-500 shadow-red-950/60" : "bg-blue-500 shadow-blue-950/60"}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            aria-label={`Robot start at ${position.x.toFixed(0)} percent across, ${position.y.toFixed(0)} percent down`}
          >
            <Bot size={21} className="text-white" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{fieldImage ? "Local official image background active." : "Built-in vector fallback active."} Coordinates stay normalized to this half-field view.</span>
          <span className="font-mono text-slate-400">x {position.x.toFixed(1)}% · y {position.y.toFixed(1)}%</span>
        </div>
      </div>
    </section>
  );
}
