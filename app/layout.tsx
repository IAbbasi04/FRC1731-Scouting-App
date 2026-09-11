import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { MetricPreferencesProvider } from "@/components/metric-preferences";

export const metadata: Metadata = {
  title: "1731 Scouting",
  description: "FRC scouting, analytics, comparisons, and pick-list tools for Team 1731.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MetricPreferencesProvider>
          <AppShell>{children}</AppShell>
        </MetricPreferencesProvider>
      </body>
    </html>
  );
}
