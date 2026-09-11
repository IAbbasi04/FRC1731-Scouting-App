import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { MetricPreferencesProvider } from "@/components/metric-preferences";
import { ScouterSessionProvider } from "@/components/scouter-session";

export const metadata: Metadata = {
  title: "1731 Scouting",
  description: "FRC scouting, analytics, comparisons, and pick-list tools for Team 1731.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ScouterSessionProvider>
          <MetricPreferencesProvider>
            <AppShell>{children}</AppShell>
          </MetricPreferencesProvider>
        </ScouterSessionProvider>
      </body>
    </html>
  );
}
