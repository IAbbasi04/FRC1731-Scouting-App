"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { publicMetricLabels, type PublicMetricKey, useMetricPreferences } from "@/components/metric-preferences";

const metrics: PublicMetricKey[] = ["opr", "epa", "dpr", "ccwm"];

export function MetricPreferencesButton() {
  const { visibility, setMetricVisible, resetMetricVisibility } = useMetricPreferences();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-blue-300/20 bg-[#0d1b2e] px-3 py-2 text-sm text-slate-200 hover:border-[#ffd84d]/50 hover:text-white"
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} /> Metrics
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-[60] w-64 rounded-2xl border border-blue-400/20 bg-[#0d1b2e] p-4 shadow-2xl shadow-black/40">
          <div className="mb-3">
            <div className="font-semibold text-white">Visible public metrics</div>
            <div className="mt-1 text-xs text-slate-500">Saved on this device and reused across the app.</div>
          </div>
          <div className="space-y-2">
            {metrics.map((metric) => (
              <label key={metric} className="flex cursor-pointer items-center justify-between rounded-lg bg-[#07111f]/70 px-3 py-2 text-sm">
                <span className="text-slate-200">{publicMetricLabels[metric]}</span>
                <input
                  type="checkbox"
                  checked={visibility[metric]}
                  onChange={(event) => setMetricVisible(metric, event.target.checked)}
                  className="h-4 w-4 accent-[#ffd84d]"
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={resetMetricVisibility} className="mt-3 text-xs font-medium text-[#ffd84d] hover:underline">
            Reset to 1731 defaults
          </button>
        </div>
      ) : null}
    </div>
  );
}
