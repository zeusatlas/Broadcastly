"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Megaphone,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiResource } from "@/hooks/use-api-resource";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePagination } from "@/hooks/use-pagination";
import {
  ApiError,
  platformApi,
  type PlatformBroadcastStatus,
} from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";

const PAGE_SIZE = 10;

const statusOptions: { value: "all" | PlatformBroadcastStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "processing", label: "Processing" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "partially_failed", label: "Partially failed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusTone: Record<PlatformBroadcastStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  pending_approval: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-sky-200 bg-sky-50 text-sky-800",
  scheduled: "border-violet-200 bg-violet-50 text-violet-800",
  processing: "border-blue-200 bg-blue-50 text-blue-800",
  submitted: "border-cyan-200 bg-cyan-50 text-cyan-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  partially_failed: "border-orange-200 bg-orange-50 text-orange-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-slate-200 bg-slate-100 text-slate-700",
};

function statusLabel(status: PlatformBroadcastStatus) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

const numberFormat = new Intl.NumberFormat("en");

export function OrganisationBroadcasts({
  organisationId,
}: {
  organisationId: string;
}) {
  const router = useRouter();
  const pagination = usePagination(PAGE_SIZE);
  const { page, setPage, total, updatePageInfo } = pagination;
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const [status, setStatus] = useState<"all" | PlatformBroadcastStatus>("all");

  const loadBroadcasts = useCallback(
    async () =>
      (
        await withAuthenticatedSession((accessToken) =>
          platformApi.listOrganisationBroadcasts(accessToken, organisationId, {
            page,
            pageSize: PAGE_SIZE,
            search: search || undefined,
            status: status === "all" ? undefined : status,
          }),
        )
      ).data,
    [organisationId, page, search, status],
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

  const { data, error, isLoading, refresh } = useApiResource(loadBroadcasts, {
    errorMessage: "Unable to load this organisation's broadcasts.",
    onError: handleRequestError,
  });
  const broadcasts = data?.items ?? [];

  useEffect(() => {
    if (data) updatePageInfo(data);
  }, [data, updatePageInfo]);

  const pageCount = pagination.totalPages;

  return (
    <Card className="min-w-0 max-w-full overflow-hidden rounded-2xl border-0 bg-card p-0">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
            <Megaphone size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold">Broadcasts</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {numberFormat.format(total)} organisation broadcasts
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 sm:w-64">
            <span className="sr-only">Search broadcasts</span>
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search broadcasts"
              className="h-9 pl-9"
            />
          </label>
          <Select
            value={status}
            onValueChange={(value) => {
              if (!value) return;
              setStatus(value as "all" | PlatformBroadcastStatus);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter broadcasts by status" className="h-9 w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-start justify-between gap-3 border-b border-destructive/15 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:px-5">
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            Try again
          </Button>
        </div>
      ) : null}

      <div className="min-w-0 p-4 sm:p-5">
        {isLoading && broadcasts.length === 0 ? (
          <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />Loading broadcasts
          </div>
        ) : !error && broadcasts.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-xl bg-[hsl(var(--brand-stone))] px-4 text-center">
            <div>
              <p className="text-sm font-semibold">No broadcasts found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query || status !== "all"
                  ? "Try changing the search or status filter."
                  : "This organisation has not sent any broadcasts yet."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                  <TableHead className="min-w-[250px]">Broadcast</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id}>
                    <TableCell className="max-w-[320px] whitespace-normal">
                      <p className="font-semibold">{broadcast.title || "Untitled broadcast"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {broadcast.audienceSummary || broadcast.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone[broadcast.status]}>
                        {statusLabel(broadcast.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numberFormat.format(broadcast.recipientCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numberFormat.format(broadcast.deliveredCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numberFormat.format(broadcast.failedCount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(broadcast.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(broadcast.scheduledAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {pagination.range.first}–{pagination.range.last} of {numberFormat.format(total)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft size={15} />Previous
                </Button>
                <span aria-live="polite" className="min-w-16 text-center text-xs text-muted-foreground">
                  Page {page} of {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage || isLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next<ChevronRight size={15} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
