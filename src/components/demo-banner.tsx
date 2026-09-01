export function DemoBanner() {
  return (
    <div className="border-b border-rule bg-caution-bg">
      <div className="mx-auto max-w-[var(--maxw)] px-4 py-1.5 text-caution ui text-[12px] leading-snug">
        <span className="font-semibold tracking-wide">DEMO DATA</span>
        <span className="mx-2 text-rule-strong">·</span>
        <span className="text-ink-2">
          Every publication, person, organisation and event on this instance is synthetic and
          fictional. Nothing here reports a real news event.
        </span>
      </div>
    </div>
  );
}
