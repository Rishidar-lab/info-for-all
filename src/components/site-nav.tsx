"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

/** Reader destinations — the things people actually come here to read. */
export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/tamil-nadu/", label: "Tamil Nadu" },
  { href: "/india/", label: "India" },
  { href: "/crisis/", label: "Crisis" },
  { href: "/politics/", label: "Politics" },
  { href: "/finance/", label: "Finance" },
  { href: "/sports/", label: "Sports" },
  { href: "/trends/", label: "Trends" },
  { href: "/search/", label: "Search" },
] as const;

/** Transparency + utility surfaces — one tap away, not in the reading path. */
export const UTILITY_NAV = [
  { href: "/landscape/", label: "Media landscape" },
  { href: "/sources/", label: "Sources" },
  { href: "/source/compare/", label: "Compare sources" },
  { href: "/about/", label: "Methodology" },
  { href: "/methodology/quality/", label: "Quality" },
  { href: "/diagnostics/", label: "Diagnostics" },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock scroll + close on Escape while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ── desktop ──────────────────────────────────────────────── */}
      <nav aria-label="Primary" className="hidden md:block">
        <ul className="ui flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px]">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "link-quiet whitespace-nowrap rounded-[2px] px-1 py-1",
                  isActive(pathname, item.href)
                    ? "font-semibold text-accent"
                    : "text-ink-2 hover:text-accent",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── mobile trigger ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-menu"
        className="ui tap -mr-1 flex items-center gap-1.5 rounded-[3px] border border-rule-strong px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 md:hidden"
      >
        <span aria-hidden className="flex flex-col gap-[3px]">
          <span className="block h-[2px] w-4 bg-current" />
          <span className="block h-[2px] w-4 bg-current" />
          <span className="block h-[2px] w-4 bg-current" />
        </span>
        Menu
      </button>

      {/* ── mobile panel ─────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-ink/40"
          />
          <div
            id="site-menu"
            className="absolute right-0 top-0 flex h-full w-[82%] max-w-[20rem] flex-col overflow-y-auto bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-rule-strong px-4 py-3">
              <span className="font-serif text-[17px] font-semibold text-ink">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="tap text-[18px] leading-none text-ink-3 hover:text-accent"
              >
                ✕
              </button>
            </div>
            <nav aria-label="Primary" className="px-2 py-2">
              <ul className="flex flex-col">
                {PRIMARY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={cn(
                        "ui block rounded-[3px] px-3 py-3 text-[15px]",
                        isActive(pathname, item.href)
                          ? "bg-accent-soft font-semibold text-accent"
                          : "text-ink hover:bg-surface-2",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-1 border-t border-rule px-2 py-2">
              <p className="label px-3 pb-1">Transparency &amp; tools</p>
              <ul className="flex flex-col">
                {UTILITY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={cn(
                        "ui block rounded-[3px] px-3 py-2.5 text-[13.5px]",
                        isActive(pathname, item.href)
                          ? "bg-accent-soft font-semibold text-accent"
                          : "text-ink-2 hover:bg-surface-2",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Desktop-only utility strip, rendered under the primary row. */
export function UtilityStrip() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Transparency and tools"
      className="ui hidden flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pb-2 pt-1.5 text-[12px] text-ink-3 md:flex"
    >
      {UTILITY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn("link-quiet hover:text-accent", isActive(pathname, item.href) && "text-accent")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
