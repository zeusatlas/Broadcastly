import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const siteLinks = [
  ["Platform", "platform"],
  ["How it works", "how-it-works"],
  ["FAQs", "faq"],
  ["Get started", "contact"],
] as const;

export function Footer2() {
  return (
    <footer className="bg-[hsl(var(--brand-midnight))] px-5 py-8 text-white md:px-[max(32px,calc((100vw-1200px)/2))]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <BrandMark light />
          <p className="max-w-[330px] text-sm leading-relaxed text-white/65">
            Bring your people, team structure and important updates together.
            Broadcastly helps organisations communicate clearly with
            accountable, approved messaging.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-[auto_auto]">
          <nav
            aria-label="Footer navigation"
            className="flex flex-col gap-3 text-sm text-white/75"
          >
            <span className="mb-1 text-[10px] font-semibold uppercase tracking-[.12em] text-white/45">
              Explore
            </span>
            {siteLinks.map(([label, href]) => (
              <Link
                key={href}
                href={`#${href}`}
                className="transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
          <nav
            aria-label="Legal"
            className="flex flex-col gap-3 text-sm text-white/75"
          >
            <span className="mb-1 text-[10px] font-semibold uppercase tracking-[.12em] text-white/45">
              Legal
            </span>
            <Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-white">Terms of Service</Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto mt-7 flex max-w-[1200px] items-center justify-between border-t border-white/15 pt-4 text-xs text-white/55">
        <span>© Broadcastly</span>
        <span>People. Permissions. Communication.</span>
      </div>
    </footer>
  );
}
