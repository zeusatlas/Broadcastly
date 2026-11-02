import Link from "next/link";
import { ArrowRight, Building2, Gauge, MessageSquareText, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { platformAdminNavigation } from "@/lib/platform-admin-navigation";

const highlights = [
  { icon: Building2, title: "Organisation administration", copy: "Review organisation setup and authorised account access.", href: "/dashboard/organisations" },
  { icon: MessageSquareText, title: "Messaging operations", copy: "Oversee SMS provider configuration and broadcast support.", href: "/dashboard/sms-providers" },
  { icon: Gauge, title: "System health", copy: "Check platform services and integration status.", href: "/dashboard/system-health" },
  { icon: ShieldCheck, title: "Governance & support", copy: "Review audit records and handle authorised support workflows.", href: "/dashboard/audit-log" },
];

export default function DashboardPage() {
  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Platform administrator</p><h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Admin dashboard</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Manage platform configuration, integrations and authorised operational support from one workspace.</p></div>
    <section aria-labelledby="admin-overview" className="mb-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Quick access</p><h2 id="admin-overview" className="mt-1 text-lg font-bold">Platform operations</h2></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{highlights.map(({ icon: Icon, title, copy, href }) => <Link href={href} key={title} className="group"><Card className="h-full rounded-2xl border-0 bg-card p-5 transition-colors group-hover:bg-white"><span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--brand-warning-amber)/.2)] text-[hsl(var(--brand-atlas-navy))]"><Icon size={19}/></span><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{copy}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[hsl(var(--brand-atlas-navy))]">Open section <ArrowRight className="transition-transform group-hover:translate-x-1" size={14}/></span></Card></Link>)}</div></section>
    <section aria-labelledby="admin-menu-title"><h2 id="admin-menu-title" className="mb-4 text-lg font-bold">All admin menus</h2><div className="grid gap-5 md:grid-cols-3">{platformAdminNavigation.map((group) => <Card key={group.title} className="rounded-2xl border border-border bg-card p-5"><h3 className="text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">{group.title}</h3><div className="mt-3 divide-y divide-border">{group.items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 py-3 text-sm font-medium transition-colors hover:text-[hsl(var(--brand-atlas-navy))]"><Icon size={20} className="shrink-0 text-muted-foreground"/>{label}<ArrowRight className="ml-auto shrink-0 text-muted-foreground" size={14}/></Link>)}</div></Card>)}</div></section>
  </div>;
}
