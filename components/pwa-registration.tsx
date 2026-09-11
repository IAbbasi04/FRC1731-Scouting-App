"use client";

import { useEffect } from "react";

function urlsToWarm() {
  const urls = new Set<string>([window.location.pathname]);

  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((script) => {
    if (script.src.startsWith(window.location.origin)) urls.add(new URL(script.src).pathname);
  });

  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((link) => {
    if (link.href.startsWith(window.location.origin)) urls.add(new URL(link.href).pathname);
  });

  return [...urls];
}

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;

        await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "CACHE_URLS", urls: urlsToWarm() });
      } catch {
        // Offline support is an enhancement; registration failure should never block scouting.
      }
    }

    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
