"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <p className="label text-dispute">Something went wrong</p>
      <h1 className="mt-2 font-serif text-[24px] font-semibold">This view could not be rendered</h1>
      {error.digest && <p className="mt-2 mono text-[12px] text-ink-3">ref {error.digest}</p>}
      <button
        onClick={reset}
        className="ui mt-4 border border-rule-strong px-3 py-1.5 text-[13px] hover:border-accent"
      >
        Try again
      </button>
    </div>
  );
}
