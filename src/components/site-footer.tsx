import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4 py-8 ui text-[13px] text-ink-3">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="max-w-md">
            <p className="font-serif text-[15px] text-ink">
              Info For All <span className="label align-middle">IFA</span>
            </p>
            <p className="mt-1 leading-relaxed">
              A crisis-first, evidence-oriented news comparison platform for Tamil Nadu and
              India. Official alerts and independent reporting, grouped by event, with source
              provenance and remaining uncertainty made visible.
            </p>
          </div>
          <nav className="flex gap-10">
            <div className="flex flex-col gap-1">
              <span className="label">Navigate</span>
              <Link href="/" className="link-quiet">Live feed</Link>
              <Link href="/sources" className="link-quiet">Sources</Link>
              <Link href="/about" className="link-quiet">Methodology</Link>
              <Link href="/methodology/examples" className="link-quiet">Demonstrations</Link>
            </div>
          </nav>
        </div>
        <p className="mt-8 border-t border-rule pt-4 text-[12px] leading-relaxed">
          IFA aggregates publicly available RSS / CAP feeds and always links to the original
          publisher. It stores only headlines, timestamps, short feed excerpts and structured
          alert metadata — never full articles. <strong>IFA is not an emergency service;</strong>{" "}
          for any emergency, follow the issuing authority&rsquo;s own instructions.
        </p>
      </div>
    </footer>
  );
}
