import { notFound } from "next/navigation";
import { ArrowRight, CircleHelp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { platformAdminSections } from "@/lib/platform-admin-navigation";

export function generateStaticParams() {
  return Object.keys(platformAdminSections).map((section) => ({ section }));
}

export default async function AdminSectionPage({ params }: PageProps<"/dashboard/[section]">) {
  const { section } = await params;
  const content = platformAdminSections[section];
  if (!content) notFound();

  return <div className="mx-auto max-w-[1100px]">
    <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowRight className="rotate-180" size={14}/>Dashboard overview</Link>
    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Platform administration</p>
    <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">{content.title}</h1>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{content.description}</p>
    <Card className="mt-8 rounded-2xl border-0 bg-card p-6 sm:p-8"><span className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--brand-warning-amber)/.2)] text-[hsl(var(--brand-atlas-navy))]"><CircleHelp size={20}/></span><h2 className="mt-5 text-base font-bold">Admin workspace section</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">This menu is ready for the platform administrator workflow. Connect it to the corresponding authorised API operations when that section is implemented.</p></Card>
  </div>;
}
