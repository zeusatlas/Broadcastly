"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Search, TriangleAlert, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, platformApi, type PlatformExecutiveStatus } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApiResource } from "@/hooks/use-api-resource";
import { usePagination } from "@/hooks/use-pagination";

const PAGE_SIZE = 10;
const statuses: { value: "all" | PlatformExecutiveStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "invited", label: "Invited" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
];

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function ExecutiveStatus({ status }: { status: PlatformExecutiveStatus }) {
  const tone = status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "suspended"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : status === "invited"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return <Badge variant="outline" className={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export function OrganisationExecutives({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const pagination = usePagination(PAGE_SIZE);
  const { page, setPage, total } = pagination;
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [status, setStatus] = useState<"all" | PlatformExecutiveStatus>("all");
  const loadExecutives = useCallback(
    async () =>
      (await withAuthenticatedSession((accessToken) =>
        platformApi.listExecutives(accessToken, organisationId, {
          page,
          pageSize: PAGE_SIZE,
          search: debouncedQuery || undefined,
          status: status === "all" ? undefined : status,
        }),
      )).data,
    [debouncedQuery, organisationId, page, status],
  );
  const handleRequestError = useCallback((requestError: unknown) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      clearTokens();
      router.replace("/auth/login");
      return true;
    }
    return false;
  }, [router]);
  const { data, error, isLoading, refresh, clearError } = useApiResource(
    loadExecutives,
    {
      errorMessage: "Unable to load this organisation's executives.",
      onError: handleRequestError,
    },
  );
  const items = data?.items ?? [];
  const { updatePageInfo } = pagination;

  useEffect(() => {
    if (data) updatePageInfo(data);
  }, [data, updatePageInfo]);

  function updateQuery(value: string) {
    setQuery(value);
    if (page !== 1) setPage(1);
    clearError();
  }

  const pageCount = pagination.totalPages;

  return (
    <Card className="min-w-0 max-w-full rounded-2xl border-0 bg-card p-5 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><UsersRound size={18} /></span>
          <div>
            <h2 className="text-sm font-bold">Executives</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{total.toLocaleString("en")} organisation executives</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 sm:w-64">
            <span className="sr-only">Search executives</span>
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search executives" className="h-9 pl-9" />
          </label>
          <Select value={status} onValueChange={(value) => {
            if (!value) return;
            const nextStatus = value as "all" | PlatformExecutiveStatus;
            if (nextStatus !== status || page !== 1) clearError();
            setStatus(nextStatus);
            setPage(1);
          }}>
            <SelectTrigger aria-label="Filter executives by status" className="h-9 w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statuses.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 min-w-0 max-w-full">
        {error ? (
          <div className="flex flex-col items-start gap-3 rounded-xl bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><TriangleAlert size={16} className="mt-0.5 shrink-0" />{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>Try again</Button>
          </div>
        ) : isLoading ? (
          <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Loading executives</div>
        ) : items.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-xl bg-[hsl(var(--brand-stone))] px-4 text-center">
            <div><p className="text-sm font-semibold">No executives found</p><p className="mt-1 text-xs text-muted-foreground">Try changing the search or status filter.</p></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Executive</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>Last sign-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((executive) => (
                  <TableRow key={executive.id}>
                    <TableCell>
                      <Link href={`/dashboard/organisations/${encodeURIComponent(organisationId)}/executives/${encodeURIComponent(executive.id)}`} className="block min-w-44 rounded-sm font-semibold text-foreground outline-none hover:text-[hsl(var(--brand-atlas-navy))] focus-visible:ring-2 focus-visible:ring-ring">
                        {executive.fullName}
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{executive.email}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-xs text-muted-foreground">{executive.positions.length ? executive.positions.join(", ") : "No positions"}</TableCell>
                    <TableCell><ExecutiveStatus status={executive.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{new Intl.NumberFormat("en").format(executive.creditBalance)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(executive.lastSignInAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Showing {pagination.range.first}–{pagination.range.last} of {total.toLocaleString("en")}</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} />Previous</Button>
                <span aria-live="polite" className="min-w-16 text-center text-xs text-muted-foreground">Page {page} of {pageCount}</span>
                <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight size={15} /></Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
