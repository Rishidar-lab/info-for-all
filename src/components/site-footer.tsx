import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4 py-8 ui text-[13px] text-ink-3">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="max-w-sm">
            <p className="font-serif text-[15px] text-ink">Info For All</p>
            <p className="mt-1 leading-relaxed">
              An evidence-first information platform. IFA does not decide what you should believe —
              it lays out sources, claims, evidence, provenance, agreement, disagreement and
              uncertainty, and leaves the conclusion to you.
            </p>
          </div>
          <nav className="flex gap-10">
            <div className="flex flex-col gap-1">
              <span className="label">Read</span>
              <Link href="/events" className="link-quiet">Events</Link>
              <Link href="/topics" className="link-quiet">Topics</Link>
              <Link href="/sources" className="link-quiet">Sources</Link>
              <Link href="/evidence" className="link-quiet">Evidence</Link>
            </div>
            <div className="flex flex-col gap-1">
              <span className="label">Understand</span>
              <Link href="/methodology" className="link-quiet">Methodology</Link>
              <Link href="/about" className="link-quiet">About</Link>
              <Link href="/api/health" className="link-quiet">System status</Link>
            </div>
          </nav>
        </div>
        <p className="mt-8 border-t border-rule pt-4 text-[12px]">
          IFA MVP v0.1 · Running on synthetic <span className="font-semibold">DEMO DATA</span>.
          The Common Ground Index is an experimental, explainable metric — see{" "}
          <Link href="/methodology" className="link-quiet underline">Methodology</Link>.
        </p>
      </div>
    </footer>
  );
}
