import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

export interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <main className="min-h-svh bg-[hsl(var(--brand-stone))] px-5 py-6 text-[hsl(var(--brand-ink))] sm:px-8 sm:py-8">
    <div className="mx-auto max-w-[1000px]">
      <header className="flex items-center justify-between"><BrandMark/><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={14}/> Back to home</Link></header>
      <article className="mt-12 rounded-[28px] bg-card px-6 py-8 sm:mt-16 sm:px-12 sm:py-12">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Broadcastly · Legal</p>
        <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-[-.06em] sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-[720px] text-sm leading-relaxed text-muted-foreground">{intro}</p>
        <div className="mt-6 rounded-xl border border-[hsl(var(--brand-warning-amber)/.55)] bg-[hsl(var(--brand-warning-amber)/.12)] px-4 py-3 text-xs leading-relaxed text-foreground/80">
          Draft for review: before publishing, confirm the service operator, contact details, applicable jurisdiction, vendors, data practices and retention periods.
        </div>
        <p className="mt-6 border-b border-border pb-5 text-xs text-muted-foreground">Last updated: November 2, 2026</p>
        <div className="divide-y divide-border">
          {sections.map((section) => <section key={section.title} className="py-6 first:pt-7 last:pb-0">
            <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold tracking-[-.03em]">{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-relaxed text-muted-foreground">{paragraph}</p>)}
            {section.items && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>)}
        </div>
        <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">Questions? Contact <a className="font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline" href="mailto:support@broadcastly.com">support@broadcastly.com</a>.</p>
      </article>
      <footer className="flex justify-between py-6 text-xs text-muted-foreground"><span>© Broadcastly</span><div className="flex gap-4"><Link href="/privacy-policy" className="hover:text-foreground">Privacy</Link><Link href="/terms-of-service" className="hover:text-foreground">Terms</Link></div></footer>
    </div>
  </main>;
}
