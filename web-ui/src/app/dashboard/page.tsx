import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  Mail,
  MessageSquareText,
  RefreshCw,
  Server,
  TriangleAlert,
  Waypoints,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const metrics = [
  {
    label: "Active organisations",
    value: "128",
    note: "Across the platform",
    icon: Building2,
    tone: "bg-sky-100 text-sky-700",
  },
  {
    label: "Broadcasts today",
    value: "1,284",
    note: "All organisation activity",
    icon: MessageSquareText,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    label: "Credit purchases today",
    value: "36",
    note: "Verified purchases",
    icon: CreditCard,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Failed jobs",
    value: "3",
    note: "Need administrator review",
    icon: TriangleAlert,
    tone: "bg-amber-100 text-amber-800",
    href: "/dashboard/jobs-errors",
  },
];

const attentionItems = [
  {
    title: "SMS dispatch could not complete",
    detail: "Northside Community · 8 minutes ago",
    category: "Failed job",
    tone: "bg-rose-50 text-rose-700",
  },
  {
    title: "Payment verification is delayed",
    detail: "Payment provider · 24 minutes ago",
    category: "Integration",
    tone: "bg-amber-50 text-amber-800",
  },
  {
    title: "Import processing stopped",
    detail: "Riverside Association · 41 minutes ago",
    category: "Failed job",
    tone: "bg-rose-50 text-rose-700",
  },
];

const services = [
  { name: "SMS gateway", detail: "Delivery reports processing", icon: MessageSquareText, status: "Operational" },
  { name: "Payment provider", detail: "Verification response delayed", icon: CircleDollarSign, status: "Degraded" },
  { name: "Email service", detail: "Sending normally", icon: Mail, status: "Operational" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">
            Platform administration
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Operational snapshot across organisations, messaging and platform services.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          <Activity size={15} className="text-[hsl(var(--brand-success-green))]" />
          Preview data
        </div>
      </div>

      <section aria-label="Platform activity metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, tone, href }) => {
          const content = (
            <Card className="h-full rounded-2xl border-0 bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight">{value}</p>
                </div>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon size={20} />
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{note}</p>
            </Card>
          );
          return href ? <Link href={href} key={label} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{content}</Link> : <div key={label}>{content}</div>;
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-700"><TriangleAlert size={17} /></span>
                <h2 className="text-base font-bold">Needs attention</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Failed jobs and integration issues to review.</p>
            </div>
            <Link href="/dashboard/jobs-errors" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="mt-5 divide-y divide-border">
            {attentionItems.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--brand-stone))] text-muted-foreground"><RefreshCw size={15} /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
                <span className={`ml-11 w-fit shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:ml-0 ${item.tone}`}>{item.category}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-700"><Waypoints size={17} /></span>
            <h2 className="text-base font-bold">Service health</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Current integration and infrastructure status.</p>
          <div className="mt-4 divide-y divide-border">
            {services.map(({ name, detail, icon: Icon, status }) => (
              <div key={name} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-3">
                <Icon size={17} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold ${status === "Operational" ? "text-emerald-700" : "text-amber-700"}`}>
                  <span className={`size-1.5 rounded-full ${status === "Operational" ? "bg-emerald-500" : "bg-amber-500"}`} />{status}
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/integrations" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline">
            Integration details <ArrowRight size={14} />
          </Link>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 rounded-2xl border-0 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Database size={20} /></span>
          <div>
            <h2 className="text-sm font-bold">Latest backup</h2>
            <p className="mt-1 text-xs text-muted-foreground">Most recent operational backup</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><Check size={15} /> Completed</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 size={14} /> Today, 02:15 UTC</span>
          <Link href="/dashboard/integrations" className="inline-flex items-center gap-1 font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline">Integration status <ArrowRight size={14} /></Link>
        </div>
      </Card>
      <p className="-mt-5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Server size={12} /> Values shown are sample preview data.</p>
    </div>
  );
}
