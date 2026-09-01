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
              An evidence-oriented news-comparison interface. IFA groups reporting around one
              event so you can inspect what sources agree on, where framing differs, and where
              each claim came from.
            </p>
          </div>
          <nav className="flex gap-10">
            <div className="flex flex-col gap-1">
              <span className="label">Navigate</span>
              <Link href="/" className="link-quiet">Home</Link>
              <Link href="/sources" className="link-quiet">Sources</Link>
              <Link href="/about" className="link-quiet">Methodology</Link>
            </div>
          </nav>
        </div>
        <p className="mt-8 border-t border-rule pt-4 text-[12px] leading-relaxed">
          Demonstration dataset — every publication, quote, figure and event on this instance is
          synthetic and is provided only to demonstrate IFA&rsquo;s comparison model. Nothing here
          is live reporting.
        </p>
      </div>
    </footer>
  );
}
