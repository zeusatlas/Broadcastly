"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiResource } from "@/hooks/use-api-resource";
import { usePagination } from "@/hooks/use-pagination";
import { ApiError, platformApi, type PlatformCreditTransactionType } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";

const PAGE_SIZE = 20;
const numberFormat = new Intl.NumberFormat("en");

const transactionLabels: Record<PlatformCreditTransactionType, string> = {
  purchase: "Credit purchase",
  allocation_in: "Credits received",
  allocation_out: "Credits allocated",
  reservation: "Credits reserved",
  release: "Reservation released",
  consumption: "Credits used",
  refund: "Refund",
  reversal: "Transaction reversed",
  adjustment: "Balance adjustment",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function transactionContext(
  reason: string | null,
  purchaseId: string | null,
  broadcastId: string | null,
) {
  if (reason) return reason;
  if (purchaseId) return `Purchase ${purchaseId}`;
  if (broadcastId) return `Broadcast ${broadcastId}`;
  return "—";
}

export function OrganisationCreditHistory({
  organisationId,
}: {
  organisationId: string;
}) {
  const router = useRouter();
  const pagination = usePagination(PAGE_SIZE);
  const { page, setPage, total, updatePageInfo } = pagination;

  const loadTransactions = useCallback(
    async () =>
      (
        await withAuthenticatedSession((accessToken) =>
          platformApi.listOrganisationCreditTransactions(
            accessToken,
            organisationId,
            { page, pageSize: PAGE_SIZE },
          ),
        )
      ).data,
    [organisationId, page],
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

  const { data, error, isLoading, refresh } = useApiResource(loadTransactions, {
    errorMessage: "Unable to load this organisation's credit history.",
    onError: handleRequestError,
  });
  const transactions = data?.items ?? [];

  useEffect(() => {
    if (data) updatePageInfo(data);
  }, [data, updatePageInfo]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1280px] space-y-6">
      <DashboardBreadcrumbs
        items={[
          { label: "Organisations", href: "/dashboard/organisations" },
          {
            label: "Organisation",
            href: `/dashboard/organisations/${encodeURIComponent(organisationId)}`,
          },
          { label: "Credit history" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">
            Organisation finances
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">
            Credit history
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Purchases, allocations, broadcasts and other changes to the organisation credit balance.
          </p>
        </div>
        <Link
          href={`/dashboard/organisations/${encodeURIComponent(organisationId)}`}
          className={buttonVariants({ variant: "outline", className: "w-fit" })}
        >
          <ArrowLeft size={15} />Back to organisation
        </Link>
      </div>

      <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold">Credit transactions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {numberFormat.format(total)} ledger entries
            </p>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-start justify-between gap-3 border-b border-destructive/15 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:px-5">
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />{error}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>Try again</Button>
          </div>
        ) : null}

        <div className="min-w-0 p-4 sm:p-5">
          {isLoading && transactions.length === 0 ? (
            <div role="status" className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />Loading credit history
            </div>
          ) : !error && transactions.length === 0 ? (
            <div className="grid min-h-44 place-items-center rounded-xl bg-[hsl(var(--brand-stone))] px-4 text-center">
              <div>
                <p className="text-sm font-semibold">No credit transactions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Purchases and other balance activity will appear here.</p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                    <TableHead className="min-w-[170px]">Date</TableHead>
                    <TableHead className="min-w-[170px]">Activity</TableHead>
                    <TableHead className="min-w-[220px]">Details</TableHead>
                    <TableHead className="min-w-[150px]">Initiated by</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Balance after</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const isCredit = transaction.amount >= 0;
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isCredit ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>
                            {transactionLabels[transaction.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                          {transactionContext(transaction.reason, transaction.purchaseId, transaction.broadcastId)}
                        </TableCell>
                        <TableCell className="text-xs">{transaction.initiatedBy || "System"}</TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums ${isCredit ? "text-emerald-700" : "text-amber-700"}`}>
                          <span className="inline-flex items-center justify-end gap-1">
                            {isCredit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                            {isCredit ? "+" : "−"}{numberFormat.format(Math.abs(transaction.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{numberFormat.format(transaction.balanceAfter)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {pagination.range.first}–{pagination.range.last} of {numberFormat.format(total)}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>
                    <ChevronLeft size={15} />Previous
                  </Button>
                  <span aria-live="polite" className="min-w-16 text-center text-xs text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button type="button" variant="outline" size="sm" disabled={!pagination.hasNextPage || isLoading} onClick={() => setPage((current) => current + 1)}>
                    Next<ChevronRight size={15} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
