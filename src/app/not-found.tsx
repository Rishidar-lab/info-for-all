import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="label">404</p>
      <h1 className="mt-2 font-serif text-[24px] font-semibold">This page could not be found</h1>
      <p className="mt-2 ui text-[13px] text-ink-3">
        The story or page you are looking for is not here.
      </p>
      <div className="mt-4 flex justify-center gap-4 ui text-[13px]">
        <Link href="/" className="link-quiet underline">Home</Link>
        <Link href="/sources" className="link-quiet underline">Sources</Link>
        <Link href="/about" className="link-quiet underline">Methodology</Link>
      </div>
    </div>
  );
}
