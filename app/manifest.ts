import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "1731 Scouting",
    short_name: "1731 Scout",
    description: "Offline-capable FRC scouting and analytics for Team 1731.",
    start_url: "/scouting",
    display: "standalone",
    background_color: "#07111F",
    theme_color: "#0B5FFF",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
