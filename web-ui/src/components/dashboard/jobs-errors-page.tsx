"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  FileWarning,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type JobState = "Failed" | "Retry queued · preview" | "Processing";
type Job = {
  id: string;
  kind: "SMS dispatch" | "Email" | "Import";
  organisation: string;
  error: string;
  time: string;
  attempt: number;
  processed: number;
  failed: number;
  idempotencyKey: string;
  state: JobState;
};

const initialJobs: Job[] = [
  { id: "JOB-4812", kind: "SMS dispatch", organisation: "Northstar Community", error: "Provider connection timed out during delivery.", time: "Today, 11:48", attempt: 1, processed: 184, failed: 47, idempotencyKey: "sms-nc-20261029-8841", state: "Failed" },
  { id: "JOB-4806", kind: "Import", organisation: "Riverside Association", error: "Rows 218–232 contain invalid phone numbers.", time: "Today, 11:26", attempt: 2, processed: 217, failed: 15, idempotencyKey: "import-ra-20261029-2150", state: "Failed" },
  { id: "JOB-4798", kind: "Email", organisation: "BrightPath Foundation", error: "Email service returned a temporary rate limit.", time: "Today, 10:54", attempt: 1, processed: 0, failed: 1, idempotencyKey: "email-bf-20261029-7264", state: "Failed" },
  { id: "JOB-4789", kind: "SMS dispatch", organisation: "Open Hands Collective", error: "Delivery reports are still being reconciled.", time: "Today, 10:31", attempt: 2, processed: 36, failed: 2, idempotencyKey: "sms-oh-20261029-0992", state: "Processing" },
];

const integrationErrors = [
  { id: "ERR-9021", service: "Payment provider", event: "Purchase verification callback", detail: "Provider response exceeded the 15 second timeout.", time: "Today, 11:42", severity: "Error" },
  { id: "ERR-9017", service: "SMS gateway", event: "Delivery report webhook", detail: "Signature check failed for one incoming report.", time: "Today, 11:04", severity: "Warning" },
  { id: "ERR-8998", service: "Email service", event: "Invitation delivery", detail: "Temporary rate limit; retry succeeded.", time: "Today, 09:21", severity: "Recovered" },
  { id: "ERR-8971", service: "Payment provider", event: "Payment status notification", detail: "Provider returned a temporary service error.", time: "Yesterday, 16:08", severity: "Error" },
];

const jobIcons = {
  "SMS dispatch": MessageSquareText,
  Email: Mail,
  Import: Upload,
};

function JobStateBadge({ state }: { state: JobState }) {
  const tone = state === "Failed"
    ? "border-rose-200 bg-rose-50 text-rose-800"
    : state === "Processing"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return <Badge variant="outline" className={tone}>{state}</Badge>;
}

export default function JobsErrorsPage() {
  const [jobs, setJobs] = useState(initialJobs);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [retryOpen, setRetryOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const visibleJobs = useMemo(() => {
    const value = debouncedQuery.toLowerCase();
    if (!value) return jobs;
    return jobs.filter((job) =>
      [job.id, job.kind, job.organisation, job.error, job.state].some((field) => field.toLowerCase().includes(value)),
    );
  }, [jobs, debouncedQuery]);

  const visibleErrors = useMemo(() => {
    const value = debouncedQuery.toLowerCase();
    if (!value) return integrationErrors;
    return integrationErrors.filter((error) =>
      [error.id, error.service, error.event, error.detail, error.severity].some((field) => field.toLowerCase().includes(value)),
    );
  }, [debouncedQuery]);

  function queueRetryPreview() {
    if (!selectedJob) return;
    setJobs((current) => current.map((job) =>
      job.id === selectedJob.id ? { ...job, state: "Retry queued · preview" } : job,
    ));
    setNotice(`Preview retry queued for ${selectedJob.id}. No background job was submitted.`);
    setRetryOpen(false);
    setSelectedJob(null);
  }

  const failedCount = jobs.filter((job) => job.state === "Failed").length;
  const retryingCount = jobs.filter((job) => job.state === "Retry queued · preview" || job.state === "Processing").length;
  const errorCount = integrationErrors.filter((error) => error.severity === "Error").length;

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Operations</p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Jobs and errors</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Investigate failed background work and review provider errors across the platform.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          <Clock3 size={14} /> Sample queue · updated 2 min ago
        </div>
      </div>

      {notice && <div role="status" className="flex flex-col justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950 sm:flex-row sm:items-center"><span>{notice}</span><Button variant="ghost" size="sm" onClick={() => setNotice("")} className="w-fit text-sky-950 hover:bg-sky-100">Dismiss</Button></div>}

      <section aria-label="Background job and integration error summary" className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-card p-5">
          <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Failed jobs</p><p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">{failedCount}</p></div><span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><FileWarning size={19} /></span></div>
          <p className="mt-3 text-xs text-muted-foreground">SMS, email and imports</p>
        </Card>
        <Card className="rounded-2xl border-0 bg-card p-5">
          <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Active or queued</p><p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">{retryingCount}</p></div><span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><RefreshCw size={19} /></span></div>
          <p className="mt-3 text-xs text-muted-foreground">Processing or preview retry</p>
        </Card>
        <Card className="rounded-2xl border-0 bg-card p-5">
          <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Integration errors</p><p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">{errorCount}</p></div><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><TriangleAlert size={19} /></span></div>
          <p className="mt-3 text-xs text-muted-foreground">Need administrator review</p>
        </Card>
      </section>

      <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
        <Tabs defaultValue="jobs" className="gap-0">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="h-10 w-full justify-start gap-1 rounded-xl bg-[hsl(var(--brand-stone))] p-1 sm:w-fit">
              <TabsTrigger value="jobs" className="h-8 flex-none gap-2 rounded-lg px-3 text-xs"><RefreshCw size={15} /> Background jobs</TabsTrigger>
              <TabsTrigger value="errors" className="h-8 flex-none gap-2 rounded-lg px-3 text-xs"><TriangleAlert size={15} /> Integration error log</TabsTrigger>
            </TabsList>
            <div className="relative w-full lg:max-w-sm">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search jobs and errors" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job, organisation or error" className="h-10 pl-9" />
            </div>
          </div>

          <TabsContent value="jobs" className="mt-0">
            <div className="flex flex-col gap-2 border-b border-border px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Retry only work that did not complete. Processed recipients must not be sent a duplicate message.</span>
              <Link href="/dashboard/integrations" className="inline-flex w-fit items-center gap-1 font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline">Integration status <ArrowRight size={13} /></Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                  <TableHead className="min-w-[155px] pl-5 text-[11px] font-semibold text-muted-foreground">Job</TableHead>
                  <TableHead className="min-w-[185px] text-[11px] font-semibold text-muted-foreground">Organisation</TableHead>
                  <TableHead className="min-w-[265px] text-[11px] font-semibold text-muted-foreground">Error</TableHead>
                  <TableHead className="min-w-[90px] text-right text-[11px] font-semibold text-muted-foreground">Failed</TableHead>
                  <TableHead className="min-w-[145px] text-[11px] font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="min-w-[125px] pr-5 text-right text-[11px] font-semibold text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleJobs.map((job) => {
                  const Icon = jobIcons[job.kind];
                  return <TableRow key={job.id}>
                    <TableCell className="py-4 pl-5">
                      <div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--brand-stone))] text-muted-foreground"><Icon size={15} /></span><span><span className="block text-xs font-semibold">{job.kind}</span><span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{job.id}</span></span></div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{job.organisation}</TableCell>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground"><span className="block max-w-sm">{job.error}</span><span className="mt-1 block text-[10px]">{job.time} · attempt {job.attempt}</span></TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">{job.failed}</TableCell>
                    <TableCell><JobStateBadge state={job.state} /></TableCell>
                    <TableCell className="pr-5 text-right">{job.state === "Failed" ? <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setSelectedJob(job); setRetryOpen(true); }}><RefreshCw size={13} /> Retry</Button> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                  </TableRow>;
                })}
                {visibleJobs.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">No jobs match this search.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">{visibleJobs.length} sample background jobs · retry actions are preview only</div>
          </TabsContent>

          <TabsContent value="errors" className="mt-0">
            <div className="border-b border-border px-5 py-3 text-xs text-muted-foreground">Recent errors reported by SMS, payment and email services.</div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                  <TableHead className="min-w-[150px] pl-5 text-[11px] font-semibold text-muted-foreground">Service</TableHead>
                  <TableHead className="min-w-[220px] text-[11px] font-semibold text-muted-foreground">Event</TableHead>
                  <TableHead className="min-w-[300px] text-[11px] font-semibold text-muted-foreground">Error details</TableHead>
                  <TableHead className="min-w-[145px] text-[11px] font-semibold text-muted-foreground">Occurred</TableHead>
                  <TableHead className="min-w-[130px] pr-5 text-[11px] font-semibold text-muted-foreground">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleErrors.map((error) => <TableRow key={error.id}>
                  <TableCell className="py-4 pl-5 text-xs font-medium">{error.service}</TableCell>
                  <TableCell><span className="text-xs font-medium">{error.event}</span><span className="mt-1 block font-mono text-[10px] text-muted-foreground">{error.id}</span></TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">{error.detail}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{error.time}</TableCell>
                  <TableCell className="pr-5"><Badge variant="outline" className={error.severity === "Error" ? "border-rose-200 bg-rose-50 text-rose-800" : error.severity === "Warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}>{error.severity}</Badge></TableCell>
                </TableRow>)}
                {visibleErrors.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">No integration errors match this search.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">{visibleErrors.length} sample integration events</div>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs leading-relaxed text-amber-950">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <p><span className="font-semibold">Safe retries:</span> production retry endpoints must reuse the original idempotency key and skip recipients or rows already processed. These controls only update the local preview.</p>
      </div>

      <Sheet open={retryOpen} onOpenChange={setRetryOpen}>
        <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 p-0">
          <SheetHeader className="border-b border-border p-6 pr-14">
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><RefreshCw size={19} /></div>
            <SheetTitle className="text-xl font-bold">Retry failed job</SheetTitle>
            <SheetDescription>Review the failure details before queuing another attempt.</SheetDescription>
          </SheetHeader>
          {selectedJob && <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-[hsl(var(--brand-stone))] p-4">
              <div><p className="text-[10px] text-muted-foreground">Job</p><p className="mt-1 text-xs font-semibold">{selectedJob.kind} · {selectedJob.id}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Organisation</p><p className="mt-1 text-xs font-semibold">{selectedJob.organisation}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Already processed</p><p className="mt-1 text-xs font-semibold tabular-nums">{selectedJob.processed}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Failed</p><p className="mt-1 text-xs font-semibold tabular-nums">{selectedJob.failed}</p></div>
              <div className="col-span-2"><p className="text-[10px] text-muted-foreground">Original idempotency key</p><p className="mt-1 break-all font-mono text-[11px] font-semibold">{selectedJob.idempotencyKey}</p></div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950"><span className="font-semibold">Idempotency check required.</span> A live retry must reuse the key above and process only unfinished recipients or rows, so already completed work is not duplicated.</div>
            <Button onClick={queueRetryPreview} className="w-full gap-2"><Check size={15} /> Queue retry preview</Button>
            <p className="text-center text-[10px] text-muted-foreground">Preview only — no task or message will be sent.</p>
          </div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
