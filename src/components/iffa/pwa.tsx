"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and shows a small "offline — showing the last
 * fetched snapshot" strip. It never claims cached data is live; each page also
 * carries its own "last run" timestamp.
 */
export function Pwa() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Derive the deploy base path from a Next asset URL ("/info-for-all/_next/…"
      // in production, "/_next/…" locally) so the SW scope is correct on any route.
      const assetSrc =
        document.querySelector<HTMLScriptElement>('script[src*="/_next/static/"]')?.src ?? "";
      let scope = "/";
      try {
        const p = new URL(assetSrc, window.location.href).pathname;
        scope = p.slice(0, p.indexOf("/_next/")) + "/";
        if (!scope.startsWith("/")) scope = "/";
      } catch {
        scope = "/";
      }
      navigator.serviceWorker.register(`${scope}sw.js`, { scope }).catch(() => {});
    }
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="ui sticky top-0 z-50 bg-caution-bg px-4 py-1.5 text-center text-[12px] font-semibold text-caution"
    >
      Offline — showing the snapshot last fetched by this browser. It is not live.
    </div>
  );
}
