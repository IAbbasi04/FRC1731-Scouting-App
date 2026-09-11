"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PublicMetricKey = "epa" | "opr" | "dpr" | "ccwm";

export type MetricVisibility = Record<PublicMetricKey, boolean>;

const STORAGE_KEY = "1731.metric-visibility.v1";

const defaultVisibility: MetricVisibility = {
  epa: false,
  opr: true,
  dpr: false,
  ccwm: false,
};

type MetricPreferencesContextValue = {
  visibility: MetricVisibility;
  setMetricVisible: (metric: PublicMetricKey, visible: boolean) => void;
  resetMetricVisibility: () => void;
};

const MetricPreferencesContext = createContext<MetricPreferencesContextValue | null>(null);

export function MetricPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [visibility, setVisibility] = useState<MetricVisibility>(defaultVisibility);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<MetricVisibility>;
      setVisibility({ ...defaultVisibility, ...parsed });
    } catch {
      // A damaged local preference should never stop the scouting app from loading.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  }, [visibility]);

  const value = useMemo<MetricPreferencesContextValue>(() => ({
    visibility,
    setMetricVisible(metric, visible) {
      setVisibility((current) => ({ ...current, [metric]: visible }));
    },
    resetMetricVisibility() {
      setVisibility(defaultVisibility);
    },
  }), [visibility]);

  return <MetricPreferencesContext.Provider value={value}>{children}</MetricPreferencesContext.Provider>;
}

export function useMetricPreferences() {
  const context = useContext(MetricPreferencesContext);
  if (!context) throw new Error("useMetricPreferences must be used inside MetricPreferencesProvider");
  return context;
}

export const publicMetricLabels: Record<PublicMetricKey, string> = {
  epa: "EPA",
  opr: "OPR",
  dpr: "DPR",
  ccwm: "CCWM",
};
