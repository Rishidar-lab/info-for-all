"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and, when the browser is offline, shows an
 * unmistakable "OFFLINE — NOT LIVE" banner with the time the snapshot was last
 * fetched. It never claims cached data is live; each page also carries its own
 * "last run" timestamp. On reconnection the page reloads to pull fresh data.
 */
export function Pwa() {
  const [offline, setOffline] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  useEffect(() => {
    let wasOffline = false;

    if ("serviceWorker" in navigator) {
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

      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "iffa:last-fetch") setLastFetch(e.data.at ?? null);
      };
      navigator.serviceWorker.addEventListener("message", onMsg);
      const askLastFetch = () =>
        navigator.serviceWorker.controller?.postMessage("iffa:last-fetch");
      askLastFetch();

      const sync = () => {
        const isOff = !navigator.onLine;
        setOffline(isOff);
        if (isOff) {
          wasOffline = true;
          askLastFetch();
        } else if (wasOffline) {
          // reconnected — pull a fresh copy rather than keep the cached page
          window.location.reload();
        }
      };
      sync();
      window.addEventListener("online", sync);
      window.addEventListener("offline", sync);
      return () => {
        navigator.serviceWorker.removeEventListener("message", onMsg);
        window.removeEventListener("online", sync);
        window.removeEventListener("offline", sync);
      };
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

  const stamp = lastFetch
    ? new Date(lastFetch).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div
      role="alert"
      className="ui sticky top-0 z-50 border-b border-dispute/40 bg-dispute-bg px-4 py-2 text-center text-[12px] leading-tight text-dispute"
    >
      <strong className="font-bold uppercase tracking-wide">Offline — not live.</strong>{" "}
      Showing the last snapshot this browser fetched
      {stamp ? ` (${stamp})` : ""}. It will refresh when you reconnect.
    </div>
  );
}
