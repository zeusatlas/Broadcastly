import Link from "next/link";
import { ArrowUpRight, Check, LockKeyhole, Megaphone, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[hsl(var(--brand-stone))] text-foreground">
    <header className="mx-auto flex h-[72px] w-[min(1200px,calc(100%-40px))] items-center justify-between">
      <BrandMark/><Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">Back to home <ArrowUpRight size={14}/></Link>
    </header>
    <main className="mx-auto grid min-h-[calc(100vh-120px)] w-[min(1200px,calc(100%-40px))] items-stretch gap-6 pb-8 md:grid-cols-[.95fr_1.05fr] md:gap-10">
      <aside className="relative hidden overflow-hidden rounded-[32px] bg-[hsl(var(--brand-atlas-navy))] p-10 text-white md:flex md:flex-col md:justify-between lg:p-14">
        <div aria-hidden="true" className="absolute -right-20 -top-24 size-80 rounded-full border border-white/10"/><div aria-hidden="true" className="absolute -right-8 -top-12 size-56 rounded-full border border-white/10"/>
        <div className="relative"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[hsl(var(--brand-warning-amber))]">Broadcastly workspace</p><h1 className="mt-7 max-w-[530px] font-[family-name:var(--font-manrope)] text-[clamp(42px,5vw,68px)] font-extrabold uppercase leading-[.94] tracking-[-.06em]">Keep your<br/>people in<br/><span className="text-white/65">the loop.</span></h1><p className="mt-6 max-w-[390px] text-sm leading-relaxed text-white/70">A considered workspace for managing people, coordinating teams and sending important updates.</p></div>
        <div className="relative grid gap-3 border-t border-white/15 pt-5 text-xs text-white/75"><span className="flex items-center gap-2"><UsersRound size={15} className="text-[hsl(var(--brand-warning-amber))]"/>People and teams, organised</span><span className="flex items-center gap-2"><LockKeyhole size={15} className="text-[hsl(var(--brand-warning-amber))]"/>Roles and access, accountable</span><span className="flex items-center gap-2"><Megaphone size={15} className="text-[hsl(var(--brand-warning-amber))]"/>Updates, clear and official</span></div>
      </aside>
      <section className="flex items-center justify-center rounded-[28px] bg-card px-5 py-10 has-[[data-auth-transparent-mobile]]:bg-transparent md:px-10 md:has-[[data-auth-transparent-mobile]]:bg-card lg:px-14"><div className="w-full max-w-[420px]">{children}</div></section>
    </main>
    <footer className="mx-auto flex w-[min(1200px,calc(100%-40px))] items-center justify-between py-4 text-[11px] text-muted-foreground"><span>© Broadcastly</span><span className="inline-flex items-center gap-1.5"><Check size={13}/> Secure account access</span></footer>
  </div>;
}

export function AuthHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">{eyebrow}</p><h2 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] text-foreground">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div>;
}
