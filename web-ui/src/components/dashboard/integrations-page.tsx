import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  TriangleAlert,
  Waypoints,
  Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const integrations = [
  {
    name: "SMS gateway",
    provider: "Messaging provider",
    status: "Operational" as const,
    icon: MessageSquareText,
    iconTone: "bg-violet-50 text-violet-700",
    description: "Outbound messaging and delivery reports",
    details: [
      { label: "Sender ID", value: "BROADCASTLY" },
      { label: "Delivery reports", value: "241 processed · 2 min ago" },
      { label: "Recent errors", value: "1 recovered" },
    ],
  },
  {
    name: "Payment provider",
    provider: "Payment processing",
    status: "Degraded" as const,
    icon: Waypoints,
    iconTone: "bg-amber-50 text-amber-800",
    description: "Payment callbacks and purchase verification",
    details: [
      { label: "Connection", value: "Responding slowly" },
      { label: "Last callback", value: "8 min ago" },
      { label: "Recent errors", value: "2 pending review" },
    ],
  },
  {
    name: "Email service",
    provider: "Transactional email",
    status: "Operational" as const,
    icon: Mail,
    iconTone: "bg-sky-50 text-sky-700",
    description: "Account invitations and platform notifications",
    details: [
      { label: "Connection", value: "Sending normally" },
      { label: "Last delivery", value: "4 min ago" },
      { label: "Recent errors", value: "None today" },
    ],
  },
];

const recentErrors = [
  {
    integration: "Payment provider",
    event: "Purchase verification callback",
    detail: "Provider response exceeded the expected time.",
    time: "Today, 11:36",
    state: "Needs review",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    integration: "Payment provider",
    event: "Payment status notification",
    detail: "Callback returned a temporary service error.",
    time: "Today, 11:14",
    state: "Needs review",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    integration: "SMS gateway",
    event: "Delivery report batch",
    detail: "One report was rejected and reprocessed successfully.",
    time: "Today, 10:52",
    state: "Recovered",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    integration: "Email service",
    event: "Administrator invitation",
    detail: "Temporary rate limit; delivery succeeded on retry.",
    time: "Today, 09:18",
    state: "Recovered",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Operations</p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Integrations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Check provider connections, message delivery reports, and recent integration errors.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          <Activity size={14} className="text-[hsl(var(--brand-success-green))]" /> Preview status
        </div>
      </div>

      <section aria-labelledby="integration-status-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="integration-status-heading" className="text-base font-bold">Connected services</h2>
            <p className="mt-1 text-xs text-muted-foreground">Connection details and recent processing activity.</p>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex"><Clock3 size={13} /> Sample check · 2 min ago</span>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {integrations.map(({ name, provider, status, icon: Icon, iconTone, description, details }) => (
            <Card key={name} className="rounded-2xl border-0 bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className={`grid size-10 place-items-center rounded-xl ${iconTone}`}><Icon size={19} /></span>
                <Badge variant="outline" className={status === "Operational" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>
                  <span className={`mr-1.5 size-1.5 rounded-full ${status === "Operational" ? "bg-emerald-500" : "bg-amber-500"}`} />{status}
                </Badge>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.1em] text-muted-foreground">{provider}</p>
              <h3 className="mt-1 text-base font-bold">{name}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
              <div className="mt-5 divide-y divide-border border-t border-border">
                {details.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-3 first:pt-3">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className={`text-right text-[11px] font-medium ${label === "Recent errors" && value.includes("pending") ? "text-amber-800" : "text-foreground/80"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-700"><Webhook size={17} /></span>
            <div>
              <h2 className="text-base font-bold">Recent integration errors</h2>
              <p className="mt-1 text-xs text-muted-foreground">Provider callbacks and message processing events that need review or have recovered.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/jobs-errors" />} className="gap-1.5">
            Open jobs and errors <ArrowRight size={14} />
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
              <TableHead className="min-w-[155px] pl-5 text-[11px] font-semibold text-muted-foreground">Integration</TableHead>
              <TableHead className="min-w-[220px] text-[11px] font-semibold text-muted-foreground">Event</TableHead>
              <TableHead className="min-w-[280px] text-[11px] font-semibold text-muted-foreground">Details</TableHead>
              <TableHead className="min-w-[130px] text-[11px] font-semibold text-muted-foreground">Occurred</TableHead>
              <TableHead className="min-w-[130px] pr-5 text-[11px] font-semibold text-muted-foreground">State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentErrors.map(({ integration, event, detail, time, state, tone }) => (
              <TableRow key={`${integration}-${event}`}>
                <TableCell className="py-4 pl-5 text-xs font-medium">{integration}</TableCell>
                <TableCell className="text-xs font-medium">{event}</TableCell>
                <TableCell className="whitespace-normal text-xs text-muted-foreground">{detail}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{time}</TableCell>
                <TableCell className="pr-5"><Badge variant="outline" className={tone}>{state}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[10px] text-muted-foreground">
          <span>4 sample events · no live provider connections</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> 2 recovered</span>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-xs leading-relaxed text-sky-950">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        <p>These service states, sender ID, and event records are sample preview data. Connect authorised provider APIs to display live connection health.</p>
      </div>
    </div>
  );
}
