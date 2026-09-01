"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({
  autoFocus = false,
  initialQuery = "",
  size = "sm",
}: {
  autoFocus?: boolean;
  initialQuery?: string;
  size?: "sm" | "lg";
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      className="w-full"
    >
      <div className="relative">
        <input
          type="search"
          name="q"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search stories, claims, sources and evidence…"
          aria-label="Search"
          className={`ui w-full border border-rule-strong bg-surface text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none ${
            size === "lg" ? "px-4 py-3 text-[15px]" : "px-3 py-1.5 text-[13px]"
          }`}
        />
      </div>
    </form>
  );
}
