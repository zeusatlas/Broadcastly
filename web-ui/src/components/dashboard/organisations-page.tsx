"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ApiError, platformApi, type PlatformOrganisation } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApiResource } from "@/hooks/use-api-resource";
import { usePagination } from "@/hooks/use-pagination";

type StatusFilter = "all" | PlatformOrganisation["status"];
type ChairmanFilter = "all" | "appointed" | "missing";

const PAGE_SIZE = 20;
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

function statusLabel(status: PlatformOrganisation["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusBadge({ status }: { status: PlatformOrganisation["status"] }) {
  const tone =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "suspended"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <Badge variant="outline" className={tone}>
      <span
        className={`mr-1.5 size-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : status === "suspended" ? "bg-rose-500" : "bg-slate-400"}`}
      />
      {statusLabel(status)}
    </Badge>
  );
}

function organisationInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

function formatCredits(value: number) {
  return `${new Intl.NumberFormat("en").format(value)} credits`;
}

export function OrganisationsPage() {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [chairman, setChairman] = useState<ChairmanFilter>("all");
  const pagination = usePagination(PAGE_SIZE);
  const { page, setPage } = pagination;
  const router = useRouter();
  const loadOrganisations = useCallback(
    async () =>
      (await withAuthenticatedSession((accessToken) =>
        platformApi.listOrganisations(accessToken, {
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          status: status === "all" ? undefined : status,
          hasChairman: chairman === "all" ? undefined : chairman === "appointed",
        }),
      )).data,
    [chairman, page, search, status],
  );
  const handleRequestError = useCallback((requestError: unknown) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      clearTokens();
      router.replace("/auth/login");
      return true;
    }
    return false;
  }, [router]);
  const { data, error, isLoading, refresh } = useApiResource(loadOrganisations, {
    errorMessage: "Unable to load organisations.",
    onError: handleRequestError,
  });
  const organisations = data?.items ?? [];
  const { total, hasNextPage, updatePageInfo } = pagination;

  useEffect(() => {
    if (data) updatePageInfo(data);
  }, [data, updatePageInfo]);

  const filtersChanged = (nextStatus: StatusFilter) => {
    setStatus(nextStatus);
    setPage(1);
  };
  const totalPages = pagination.totalPages;
  const { first: firstResult, last: lastResult } = pagination.range;

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">
          Workspace
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">
          Organisations
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Review organisation access, chairman appointments, membership and
          available credits.
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search organisation names"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search organisation name"
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
            <div
              role="group"
              aria-label="Filter organisations by status"
              className="flex flex-wrap items-center gap-1 rounded-xl bg-[hsl(var(--brand-stone))] p-1"
            >
              {statusFilters.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={status === item.value ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={status === item.value}
                  onClick={() => filtersChanged(item.value)}
                  className={
                    status === item.value
                      ? "bg-white text-[hsl(var(--brand-atlas-navy))] shadow-sm hover:bg-white hover:text-[hsl(var(--brand-atlas-navy))]"
                      : "text-muted-foreground"
                  }
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Select
              value={chairman}
              onValueChange={(value) => {
                if (!value) return;
                setChairman(value as ChairmanFilter);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Filter by chairman appointment"
                className="h-10 w-[170px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any chairman status</SelectItem>
                <SelectItem value="appointed">Chairman appointed</SelectItem>
                <SelectItem value="missing">No chairman</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-start justify-between gap-3 border-b border-destructive/15 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:px-5">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
            >
              Try again
            </Button>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
              <TableHead className="min-w-[240px] pl-5 text-[11px] font-semibold text-muted-foreground">
                Organisation
              </TableHead>
              <TableHead className="min-w-[210px] text-[11px] font-semibold text-muted-foreground">
                Chairman
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-muted-foreground">
                Members
              </TableHead>
              <TableHead className="min-w-[155px] text-right text-[11px] font-semibold text-muted-foreground">
                Credit balance
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-muted-foreground">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && organisations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-44 text-center">
                  <span
                    role="status"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Loader2 size={16} className="animate-spin" /> Loading
                    organisations…
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              organisations.map((organisation) => {
                const chairmanName =
                  organisation.chairman?.fullName ?? "Not appointed";
                return (
                  <TableRow key={organisation.id} className="group cursor-pointer" onClick={(event) => { if (!(event.target as HTMLElement).closest("a")) router.push(`/dashboard/organisations/${organisation.id}`); }}>
                                        <TableCell className="py-4 pl-5">
                      <Link href={`/dashboard/organisations/${organisation.id}`} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <Avatar className="size-9 rounded-xl after:rounded-xl" aria-hidden="true">
                          <AvatarFallback className="rounded-xl bg-[hsl(var(--brand-atlas-navy))] text-[10px] font-bold text-white">{organisationInitials(organisation.name)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground hover:text-[hsl(var(--brand-atlas-navy))]">{organisation.name}</span>
                          <span className="mt-0.5 block text-[11px] capitalize text-muted-foreground">{organisation.type.replace(/_/g, " ")} · Added {formatDate(organisation.createdAt)}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="block text-xs font-medium">
                        {chairmanName}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {organisation.chairman?.email ?? "No chairman assigned"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-end gap-1.5 text-xs tabular-nums">
                        <UsersRound
                          size={14}
                          className="text-muted-foreground"
                        />
                        {organisation.memberCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">
                      {formatCredits(organisation.credits?.balance ?? 0)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={organisation.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!isLoading && !error && organisations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-44 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center">
                    <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--brand-stone))] text-muted-foreground">
                      <Search size={18} />
                    </span>
                    <p className="mt-3 text-sm font-semibold">
                      No organisations found
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try another organisation name or change the filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {isLoading && total === 0
              ? "Loading organisation records"
              : `Showing ${firstResult}–${lastResult} of ${total} ${total === 1 ? "organisation" : "organisations"}`}
          </span>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> Updating
              </span>
            ) : null}
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1 || isLoading}
                onClick={() => {
                  setPage((value) => value - 1);
                }}
              >
                <ChevronLeft size={15} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={!hasNextPage || isLoading}
                onClick={() => {
                  setPage((value) => value + 1);
                }}
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
