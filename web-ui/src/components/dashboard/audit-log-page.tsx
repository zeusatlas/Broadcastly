"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  FileClock,
  Fingerprint,
  KeyRound,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditEvent = {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  category: string;
  organisation: string;
  summary: string;
  timestamp: string;
  displayTime: string;
  ip: string;
  details: string;
};

const events: AuditEvent[] = [
  { id: "AUD-2026-1048", actor: "Maya Owusu", actorRole: "Super Admin", action: "Organisation suspended", category: "Organisation", organisation: "Harbour View Network", summary: "Suspended organisation access after an administrator request.", timestamp: "2026-11-03T11:42:00", displayTime: "Today, 11:42", ip: "192.0.2.14", details: "Reason: Organisation leadership requested a temporary suspension pending an account review." },
  { id: "AUD-2026-1047", actor: "Daniel Asante", actorRole: "Finance", action: "Credit adjustment", category: "Credits", organisation: "Open Hands Collective", summary: "Added 300 credits to the organisation balance.", timestamp: "2026-11-03T11:15:00", displayTime: "Today, 11:15", ip: "192.0.2.28", details: "Reason: Restore credits after a confirmed delivery discrepancy. Ledger entry ADJ-2026-019." },
  { id: "AUD-2026-1046", actor: "Maya Owusu", actorRole: "Super Admin", action: "Provider settings updated", category: "Provider settings", organisation: "All organisations", summary: "Changed the platform SMS sender ID.", timestamp: "2026-11-03T10:58:00", displayTime: "Today, 10:58", ip: "192.0.2.14", details: "Sender ID changed from BROADCAST to BROADCASTLY. The change was saved to platform configuration." },
  { id: "AUD-2026-1045", actor: "Leila Mensah", actorRole: "Support", action: "Role changed", category: "System access", organisation: "BrightPath Foundation", summary: "Updated the organisation administrator role.", timestamp: "2026-11-03T10:21:00", displayTime: "Today, 10:21", ip: "192.0.2.39", details: "Access changed from Member to Administrator for account admin@example.com. Change made under an authorised support request." },
  { id: "AUD-2026-1044", actor: "Daniel Asante", actorRole: "Finance", action: "Payment verified", category: "Credits", organisation: "Northstar Community", summary: "Verified a payment with the provider before crediting the account.", timestamp: "2026-11-03T09:46:00", displayTime: "Today, 09:46", ip: "192.0.2.28", details: "Provider reference PAY-8F29-1047. Provider confirmation was received server-side before the corresponding credit purchase was posted." },
  { id: "AUD-2026-1043", actor: "Maya Owusu", actorRole: "Super Admin", action: "Administrator invited", category: "System access", organisation: "Riverside Association", summary: "Invited a new organisation administrator.", timestamp: "2026-11-02T16:09:00", displayTime: "Yesterday, 16:09", ip: "192.0.2.14", details: "Invitation sent to administrator@example.com with the Administrator role. Invitation expires after 7 days." },
  { id: "AUD-2026-1042", actor: "Leila Mensah", actorRole: "Support", action: "Audit log exported", category: "Data access", organisation: "All organisations", summary: "Exported the filtered audit activity report.", timestamp: "2026-11-02T14:31:00", displayTime: "Yesterday, 14:31", ip: "192.0.2.39", details: "Export contained 42 events for the selected date range. Export action recorded for auditability." },
  { id: "AUD-2026-1041", actor: "Daniel Asante", actorRole: "Finance", action: "Payment reversed", category: "Credits", organisation: "Riverside Association", summary: "Reversed a duplicate payment credit entry.", timestamp: "2026-11-01T12:05:00", displayTime: "01 Nov, 12:05", ip: "192.0.2.28", details: "Provider reference PAY-8F28-9102. Reversal linked to ledger entry REV-2026-031." },
];

const actors = [...new Set(events.map((event) => event.actor))];
const actions = [...new Set(events.map((event) => event.action))];
const organisations = [...new Set(events.map((event) => event.organisation))];

function makeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [organisation, setOrganisation] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const date = event.timestamp.slice(0, 10);
      const matchesQuery = !normalizedQuery || [event.actor, event.action, event.category, event.organisation, event.summary, event.id].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesQuery &&
        (actor === "all" || event.actor === actor) &&
        (action === "all" || event.action === action) &&
        (organisation === "all" || event.organisation === organisation) &&
        (!fromDate || date >= fromDate) &&
        (!toDate || date <= toDate);
    });
  }, [action, actor, fromDate, organisation, query, toDate]);

  function exportCsv() {
    const headings = ["Event ID", "Timestamp", "Administrator", "Role", "Action", "Category", "Organisation", "Summary", "Details", "IP address"];
    const rows = filteredEvents.map((event) => [event.id, event.timestamp, event.actor, event.actorRole, event.action, event.category, event.organisation, event.summary, event.details, event.ip]);
    const csv = [headings, ...rows].map((row) => row.map(makeCsvValue).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "broadcastly-audit-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const summary = [
    { label: "Events today", value: "12", icon: FileClock, tone: "bg-sky-50 text-sky-700", note: "Across platform activity" },
    { label: "Credit events", value: "4", icon: CreditCard, tone: "bg-emerald-50 text-emerald-700", note: "Purchases and adjustments" },
    { label: "Access changes", value: "3", icon: KeyRound, tone: "bg-violet-50 text-violet-700", note: "Roles and invitations" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Governance</p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Audit log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Trace administrative actions across organisations, credits, provider settings, and access.</p>
        </div>
        <Button onClick={exportCsv} className="gap-2"><ArrowDownToLine size={16} /> Export CSV</Button>
      </div>

      <section aria-label="Audit activity summary" className="grid gap-4 sm:grid-cols-3">
        {summary.map(({ label, value, icon: Icon, tone, note }) => (
          <Card key={label} className="rounded-2xl border-0 bg-card p-5">
            <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">{value}</p></div><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span></div>
            <p className="mt-3 text-xs text-muted-foreground">{note}</p>
          </Card>
        ))}
      </section>

      <Card className="overflow-visible rounded-2xl border-0 bg-card p-0">
        <div className="space-y-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--brand-stone))] text-muted-foreground"><Fingerprint size={16} /></span><div><h2 className="text-sm font-bold">Administrative activity</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Credit transactions and permission changes are included.</p></div></div>
            <div className="relative w-full md:max-w-xs"><Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search audit log" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity" className="h-9 pl-9" /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_155px_155px_auto] xl:items-end">
            <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground" htmlFor="audit-actor">Administrator</Label><Select value={actor} onValueChange={(value) => value && setActor(value)}><SelectTrigger id="audit-actor" className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All administrators</SelectItem>{actors.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground" htmlFor="audit-action">Action</Label><Select value={action} onValueChange={(value) => value && setAction(value)}><SelectTrigger id="audit-action" className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All actions</SelectItem>{actions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground" htmlFor="audit-organisation">Organisation</Label><Select value={organisation} onValueChange={(value) => value && setOrganisation(value)}><SelectTrigger id="audit-organisation" className="h-9 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All organisations</SelectItem>{organisations.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground" htmlFor="audit-from">From</Label><Input id="audit-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground" htmlFor="audit-to">To</Label><Input id="audit-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-9 text-xs" /></div>
            <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setQuery(""); setActor("all"); setAction("all"); setOrganisation("all"); setFromDate(""); setToDate(""); }}><CalendarDays size={14} /> Clear filters</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
              <TableHead className="min-w-[170px] pl-5 text-[11px] font-semibold text-muted-foreground">When</TableHead>
              <TableHead className="min-w-[180px] text-[11px] font-semibold text-muted-foreground">Administrator</TableHead>
              <TableHead className="min-w-[170px] text-[11px] font-semibold text-muted-foreground">Action</TableHead>
              <TableHead className="min-w-[180px] text-[11px] font-semibold text-muted-foreground">Organisation</TableHead>
              <TableHead className="min-w-[320px] text-[11px] font-semibold text-muted-foreground">Activity</TableHead>
              <TableHead className="pr-5 text-right text-[11px] font-semibold text-muted-foreground">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="py-4 pl-5"><p className="text-xs font-medium">{event.displayTime}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{event.id}</p></TableCell>
                <TableCell><p className="text-xs font-semibold">{event.actor}</p><p className="mt-1 text-[10px] text-muted-foreground">{event.actorRole}</p></TableCell>
                <TableCell><Badge variant="outline" className="border-border bg-background text-foreground/80">{event.category}</Badge><p className="mt-1.5 text-[10px] font-medium text-foreground/80">{event.action}</p></TableCell>
                <TableCell className="text-xs text-foreground/80">{event.organisation}</TableCell>
                <TableCell className="whitespace-normal text-xs text-muted-foreground"><span className="block max-w-lg">{event.summary}</span></TableCell>
                <TableCell className="pr-5 text-right"><Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setSelectedEvent(event)}>View <ArrowUpRight size={13} /></Button></TableCell>
              </TableRow>
            ))}
            {filteredEvents.length === 0 && <TableRow><TableCell colSpan={6} className="h-36 text-center"><div className="mx-auto max-w-xs"><p className="text-sm font-semibold">No audit events found</p><p className="mt-1 text-xs text-muted-foreground">Adjust the filters or date range to see more activity.</p></div></TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-1 border-t border-border px-5 py-3 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Showing {filteredEvents.length} sample audit events</span><span>Actions shown are preview records</span></div>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-xs leading-relaxed text-sky-950"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><p>Audit records and administrator details are sample data. In production, records should be immutable and permission checks should control who can view or export them.</p></div>

      <Sheet open={selectedEvent !== null} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 overflow-y-auto p-0">
          {selectedEvent && <>
            <SheetHeader className="border-b border-border p-6 pr-14"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-[hsl(var(--brand-warning-amber)/.2)] text-[hsl(var(--brand-atlas-navy))]"><BadgeCheck size={19} /></div><SheetTitle className="text-xl font-bold">Audit event</SheetTitle><SheetDescription>{selectedEvent.action} · {selectedEvent.id}</SheetDescription></SheetHeader>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl bg-[hsl(var(--brand-stone))] p-4">
                <div><p className="text-[10px] text-muted-foreground">Administrator</p><p className="mt-1 text-xs font-semibold">{selectedEvent.actor}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{selectedEvent.actorRole}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Date and time</p><p className="mt-1 text-xs font-semibold">{selectedEvent.displayTime}</p></div>
                <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Organisation</p><p className="mt-1 text-xs font-semibold">{selectedEvent.organisation}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Category</p><p className="mt-1 text-xs font-semibold">{selectedEvent.category}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Source IP</p><p className="mt-1 font-mono text-xs font-semibold">{selectedEvent.ip}</p></div>
              </div>
              <div><h3 className="text-xs font-semibold">Event summary</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedEvent.summary}</p></div>
              <div className="rounded-xl border border-border p-4"><h3 className="text-xs font-semibold">Recorded details</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{selectedEvent.details}</p></div>
              <p className="text-[10px] text-muted-foreground">This sample event is read-only.</p>
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
