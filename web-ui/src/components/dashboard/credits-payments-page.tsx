"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileClock,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { organisations } from "@/lib/organisations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApiResource } from "@/hooks/use-api-resource";
import { usePagination } from "@/hooks/use-pagination";
import { ApiError, platformApi, type PlatformPurchaseStatus } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";

type LedgerKind = "Purchase" | "Allocation" | "Reservation" | "Consumption" | "Refund" | "Reversal" | "Adjustment";
type LedgerEntry = {
  id: string;
  organisation: string;
  type: LedgerKind;
  description: string;
  reference: string;
  quantity: number;
  date: string;
  reason?: string;
};

const initialLedger: LedgerEntry[] = [
  { id: "l-1", organisation: "Northstar Community", type: "Purchase", description: "Credit bundle purchase", reference: "PAY-8F29-1047", quantity: 12500, date: "Today, 11:43" },
  { id: "l-2", organisation: "BrightPath Foundation", type: "Allocation", description: "Unit messaging allocation", reference: "ALC-2026-183", quantity: -1800, date: "Today, 10:52" },
  { id: "l-3", organisation: "Northstar Community", type: "Reservation", description: "Broadcast reservation", reference: "RSV-2026-842", quantity: -1240, date: "Today, 10:42" },
  { id: "l-4", organisation: "Riverside Association", type: "Consumption", description: "Broadcast delivery", reference: "BRD-2026-619", quantity: -1080, date: "Today, 09:23" },
  { id: "l-5", organisation: "BrightPath Foundation", type: "Refund", description: "Unused message credits", reference: "RFD-2026-064", quantity: 240, date: "Yesterday, 16:51" },
  { id: "l-6", organisation: "Harbour View Network", type: "Reversal", description: "Duplicate provider transaction", reference: "REV-2026-031", quantity: 560, date: "Yesterday, 13:15" },
  { id: "l-7", organisation: "Open Hands Collective", type: "Adjustment", description: "Courtesy credit correction", reference: "ADJ-2026-019", quantity: 300, date: "28 Oct 2026, 09:32", reason: "Restore credits after a confirmed delivery discrepancy." },
];

const currency = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 });
const creditCount = new Intl.NumberFormat("en");

function PurchaseStatusBadge({ status }: { status: PlatformPurchaseStatus }) {
  const styles: Record<PlatformPurchaseStatus, string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    failed: "border-rose-200 bg-rose-50 text-rose-800",
  };
  const label = status === "completed" ? "Completed" : status === "pending" ? "Pending" : "Failed";
  return <Badge variant="outline" className={styles[status]}>{label}</Badge>;
}

function formatPurchaseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

const summaryCards = [
  { label: "Purchases today", icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
  { label: "Pending purchases", icon: FileClock, tone: "bg-amber-50 text-amber-800" },
  { label: "Credits purchased today", icon: WalletCards, tone: "bg-sky-50 text-sky-700" },
];

export function CreditsPaymentsPage() {
  const router = useRouter();
  const [ledger, setLedger] = useState(initialLedger);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDirection, setAdjustDirection] = useState("credit");
  const [selectedOrganisation, setSelectedOrganisation] = useState(organisations[0]?.name ?? "");
  const [notice, setNotice] = useState("");
  const pagination = usePagination(10);
  const { page, setPage, updatePageInfo } = pagination;

  const loadTodayPurchases = useCallback(
    async () =>
      withAuthenticatedSession(async (accessToken) => {
        const [summaryResponse, purchasesResponse] = await Promise.all([
          platformApi.getPurchaseSummary(accessToken, "today"),
          platformApi.listPurchases(accessToken, {
            page,
            pageSize: 10,
            period: "today",
          }),
        ]);
        return {
          summary: summaryResponse.data,
          purchases: purchasesResponse.data,
        };
      }),
    [page],
  );
  const handleRequestError = useCallback(
    (requestError: unknown) => {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearTokens();
        router.replace("/auth/login");
        return true;
      }
      return false;
    },
    [router],
  );
  const {
    data: purchaseData,
    error: purchaseError,
    isLoading: isPurchasesLoading,
    refresh: refreshPurchases,
  } = useApiResource(loadTodayPurchases, {
    errorMessage: "Unable to load today's purchases.",
    onError: handleRequestError,
  });
  const todayPurchases = purchaseData?.purchases.items;

  useEffect(() => {
    if (purchaseData) updatePageInfo(purchaseData.purchases);
  }, [purchaseData, updatePageInfo]);

  const visiblePayments = useMemo(() => {
    const value = debouncedQuery.toLowerCase();
    const purchases = todayPurchases ?? [];
    if (!value) return purchases;
    return purchases.filter((purchase) =>
      [purchase.reference, purchase.organisationName, purchase.status].some((field) => field.toLowerCase().includes(value)),
    );
  }, [todayPurchases, debouncedQuery]);

  const visibleLedger = useMemo(() => {
    const value = debouncedQuery.toLowerCase();
    if (!value) return ledger;
    return ledger.filter((entry) =>
      [entry.organisation, entry.type, entry.description, entry.reference, entry.reason ?? ""].some((field) => field.toLowerCase().includes(value)),
    );
  }, [ledger, debouncedQuery]);

  function recordAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("adjustmentAmount"));
    const reason = String(formData.get("adjustmentReason") ?? "").trim();
    const type = adjustDirection === "credit" ? "Adjustment" : "Adjustment";
    if (!Number.isFinite(amount) || amount <= 0 || !reason || !selectedOrganisation) return;

    const newEntry: LedgerEntry = {
      id: `l-${Date.now()}`,
      organisation: selectedOrganisation,
      type,
      description: adjustDirection === "credit" ? "Manual credit adjustment" : "Manual debit adjustment",
      reference: `ADJ-PREVIEW-${Date.now().toString().slice(-5)}`,
      quantity: adjustDirection === "credit" ? amount : -amount,
      date: "Just now",
      reason,
    };
    setLedger((current) => [newEntry, ...current]);
    setAdjustOpen(false);
    setNotice("Preview adjustment added to the ledger. No live organisation balance was changed.");
    event.currentTarget.reset();
  }

  const purchaseSummary = [
    {
      ...summaryCards[0],
      value: purchaseData ? creditCount.format(purchaseData.purchases.total) : isPurchasesLoading ? "…" : "—",
      note: purchaseData
        ? `${currency.format(purchaseData.summary.amountPaidPesewas / 100)} paid from completed purchases`
        : "All purchase statuses for today",
    },
    {
      ...summaryCards[1],
      value: purchaseData ? creditCount.format(purchaseData.summary.pendingPurchases) : isPurchasesLoading ? "…" : "—",
      note: "Awaiting payment completion",
    },
    {
      ...summaryCards[2],
      value: purchaseData ? creditCount.format(purchaseData.summary.creditsPurchased) : isPurchasesLoading ? "…" : "—",
      note: "Credits from completed purchases today",
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Finance</p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Credits and payments</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Review provider payments and trace every credit movement across organisations.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setAdjustOpen(true)}><Plus size={16} /> Record adjustment</Button>
      </div>

      {notice && (
        <div role="status" className="flex flex-col justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 sm:flex-row sm:items-center">
          <span>{notice}</span>
          <Button variant="ghost" size="sm" className="w-fit text-sky-900 hover:bg-sky-100" onClick={() => setNotice("")}>Dismiss</Button>
        </div>
      )}

      {purchaseError ? (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center">
          <p role="alert" className="flex items-center gap-2 text-xs text-destructive">
            <TriangleAlert size={15} />{purchaseError}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={refreshPurchases}>Try again</Button>
        </div>
      ) : null}

      <section aria-label="Credit and payment summary" className="grid gap-4 md:grid-cols-3">
        {purchaseSummary.map(({ label, value, note, icon: Icon, tone }) => (
          <Card key={label} className="rounded-2xl border-0 bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
              </div>
              <span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon size={19} /></span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{note}</p>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
        <Tabs defaultValue="payments" className="gap-0">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="h-10 w-full justify-start gap-1 rounded-xl bg-[hsl(var(--brand-stone))] p-1 sm:w-fit">
              <TabsTrigger value="payments" className="h-8 flex-none gap-2 rounded-lg px-3 text-xs"><CircleDollarSign size={15} /> Payments</TabsTrigger>
              <TabsTrigger value="ledger" className="h-8 flex-none gap-2 rounded-lg px-3 text-xs"><FileClock size={15} /> Credit ledger</TabsTrigger>
            </TabsList>
            <div className="relative w-full lg:max-w-sm">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search payments and credit ledger" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organisation or reference" className="h-10 pl-9" />
            </div>
          </div>

          <TabsContent value="payments" className="mt-0">
            <div className="border-b border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">Purchases created today, newest first.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                  <TableHead className="min-w-[185px] pl-5 text-[11px] font-semibold text-muted-foreground">Provider reference</TableHead>
                  <TableHead className="min-w-[190px] text-[11px] font-semibold text-muted-foreground">Organisation</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-muted-foreground">Credits</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-muted-foreground">Amount</TableHead>
                  <TableHead className="min-w-[155px] text-[11px] font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="min-w-[170px] pr-5 text-[11px] font-semibold text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPurchasesLoading && visiblePayments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground"><span role="status" className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Loading today’s purchases</span></TableCell></TableRow>
                ) : visiblePayments.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="py-4 pl-5 font-mono text-[11px] font-medium">{purchase.reference}</TableCell>
                    <TableCell className="text-xs font-medium">{purchase.organisationName}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums">{creditCount.format(purchase.credits)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums">{currency.format(purchase.amountPesewas / 100)}</TableCell>
                    <TableCell><PurchaseStatusBadge status={purchase.status} /></TableCell>
                    <TableCell className="pr-5 text-xs text-muted-foreground">{formatPurchaseDate(purchase.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!isPurchasesLoading && visiblePayments.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">{query ? "No purchases on this page match the search." : "No purchases have been made today."}</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-muted-foreground">{pagination.range.first}–{pagination.range.last} of {creditCount.format(pagination.total)} purchases today · API data</p>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1 || isPurchasesLoading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={14} />Previous</Button>
                <span aria-live="polite" className="min-w-16 text-center text-[10px] text-muted-foreground">Page {page} of {pagination.totalPages}</span>
                <Button type="button" size="sm" variant="outline" disabled={!pagination.hasNextPage || isPurchasesLoading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={14} /></Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ledger" className="mt-0">
            <div className="border-b border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">Purchases, allocations, reservations, consumption, refunds, reversals and adjustments.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                  <TableHead className="min-w-[190px] pl-5 text-[11px] font-semibold text-muted-foreground">Organisation</TableHead>
                  <TableHead className="min-w-[130px] text-[11px] font-semibold text-muted-foreground">Entry type</TableHead>
                  <TableHead className="min-w-[220px] text-[11px] font-semibold text-muted-foreground">Description and reason</TableHead>
                  <TableHead className="min-w-[155px] text-[11px] font-semibold text-muted-foreground">Reference</TableHead>
                  <TableHead className="min-w-[130px] text-right text-[11px] font-semibold text-muted-foreground">Credit change</TableHead>
                  <TableHead className="min-w-[130px] pr-5 text-right text-[11px] font-semibold text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLedger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="py-4 pl-5 text-xs font-medium">{entry.organisation}</TableCell>
                    <TableCell><Badge variant="outline" className="border-border bg-background text-foreground/80">{entry.type}</Badge></TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{entry.description}</p>
                      {entry.reason && <p className="mt-1 max-w-xs whitespace-normal text-[10px] leading-relaxed text-muted-foreground">Reason: {entry.reason}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{entry.reference}</TableCell>
                    <TableCell className={`text-right text-xs font-semibold tabular-nums ${entry.quantity > 0 ? "text-emerald-700" : "text-foreground"}`}>
                      <span className="inline-flex items-center justify-end gap-1">{entry.quantity > 0 ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}{entry.quantity > 0 ? "+" : ""}{creditCount.format(entry.quantity)}</span>
                    </TableCell>
                    <TableCell className="pr-5 text-right text-xs text-muted-foreground">{entry.date}</TableCell>
                  </TableRow>
                ))}
                {visibleLedger.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">No ledger entries match this search.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">{visibleLedger.length} sample ledger entries · manual changes include a reason</div>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs leading-relaxed text-amber-950">
        <ShieldCheck size={17} className="mt-0.5 shrink-0" />
        <p><span className="font-semibold">Payment safety:</span> a server-side provider confirmation is required before credits are added. Preview actions on this page do not contact the provider or change organisation balances.</p>
      </div>

      <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
        <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 overflow-y-auto p-0">
          <SheetHeader className="border-b border-border p-6 pr-14">
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-[hsl(var(--brand-warning-amber)/.2)] text-[hsl(var(--brand-atlas-navy))]"><CircleDollarSign size={19} /></div>
            <SheetTitle className="text-xl font-bold">Record a credit adjustment</SheetTitle>
            <SheetDescription>Every manual balance change needs a reason and a ledger entry.</SheetDescription>
          </SheetHeader>
          <form onSubmit={recordAdjustment} className="flex flex-1 flex-col">
            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-950">Preview mode: the adjustment will appear in this ledger for this session. It will not update a live balance.</div>
              <div className="space-y-2">
                <Label htmlFor="adjustment-organisation">Organisation</Label>
                <Select value={selectedOrganisation} onValueChange={(value) => value && setSelectedOrganisation(value)}>
                  <SelectTrigger id="adjustment-organisation" className="h-11 w-full"><SelectValue placeholder="Choose an organisation" /></SelectTrigger>
                  <SelectContent>{organisations.map((organisation) => <SelectItem key={organisation.id} value={organisation.name}>{organisation.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment-type">Adjustment type</Label>
                <Select value={adjustDirection} onValueChange={(value) => value && setAdjustDirection(value)}>
                  <SelectTrigger id="adjustment-type" className="h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="credit">Add credits</SelectItem><SelectItem value="debit">Remove credits</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment-amount">Credit amount</Label>
                <Input id="adjustment-amount" name="adjustmentAmount" type="number" min="1" step="1" placeholder="e.g. 500" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment-reason">Reason for adjustment</Label>
                <textarea id="adjustment-reason" name="adjustmentReason" required maxLength={300} placeholder="Explain why this change is needed" className="min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" />
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t border-border bg-card p-5">
              <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button type="submit" className="gap-2"><Check size={15} /> Add ledger entry</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
