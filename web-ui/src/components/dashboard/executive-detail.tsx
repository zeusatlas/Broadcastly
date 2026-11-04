"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Ban,
  CircleDollarSign,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ApiError,
  platformApi,
  type PlatformExecutive,
  type PlatformOrganisation,
} from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatDate(value: string | null | undefined, emptyLabel = "Never") {
  if (!value) return emptyLabel;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusTone(status: PlatformExecutive["status"]) {
  if (status === "active")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
  if (status === "suspended")
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300";
  if (status === "invited")
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300";
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

type FailureSource = "organisation" | "executive";

function PageShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs: { label: string; href?: string }[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <DashboardBreadcrumbs items={breadcrumbs} />
      {children}
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="rounded-2xl border-0 bg-card p-5">
      <dl>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-3">{children}</dd>
      </dl>
    </Card>
  );
}

export function ExecutiveDetail({
  organisationId,
  executiveId,
}: {
  organisationId: string;
  executiveId: string;
}) {
  const router = useRouter();
  const requestKey = `${organisationId}:${executiveId}`;

  const [record, setRecord] = useState<{
    key: string;
    organisation: PlatformOrganisation;
    executive: PlatformExecutive;
  } | null>(null);
  const [errorState, setErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "suspend" | "reactivate" | null
  >(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState("");

  // Only use data / errors that belong to the IDs currently being viewed.
  const detail = record?.key === requestKey ? record : null;
  const error = errorState?.key === requestKey ? errorState.message : "";

  async function handleStatusAction() {
    if (!pendingStatusAction) return;
    const action = pendingStatusAction;
    setIsUpdatingStatus(true);
    setStatusActionError("");
    try {
      const response = await withAuthenticatedSession((accessToken) =>
        action === "suspend"
          ? platformApi.suspendExecutive(accessToken, organisationId, executiveId)
          : platformApi.reactivateExecutive(accessToken, organisationId, executiveId),
      );
      setRecord((current) =>
        current?.key === requestKey
          ? { ...current, executive: response.data }
          : current,
      );
      setPendingStatusAction(null);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearTokens();
        router.replace("/auth/login");
        return;
      }
      setStatusActionError(
        requestError instanceof Error
          ? requestError.message
          : `Unable to ${action} this executive.`,
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  useEffect(() => {
    let active = true;
    const failure: { source: FailureSource | null } = { source: null };

    void withAuthenticatedSession(async (accessToken) => {
      const [organisationResult, executiveResult] = await Promise.allSettled([
        platformApi.getOrganisation(accessToken, organisationId),
        platformApi.getExecutive(accessToken, organisationId, executiveId),
      ]);

      if (organisationResult.status === "rejected") {
        failure.source = "organisation";
        throw organisationResult.reason;
      }
      if (executiveResult.status === "rejected") {
        failure.source = "executive";
        throw executiveResult.reason;
      }

      return {
        organisation: organisationResult.value.data,
        executive: executiveResult.value.data,
      };
    })
      .then((result) => {
        if (!active) return;
        setErrorState(null);
        setRecord({ key: requestKey, ...result });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          clearTokens();
          router.replace("/auth/login");
          return;
        }

        let message = "Unable to load this executive.";
        if (requestError instanceof ApiError && requestError.status === 404) {
          message =
            failure.source === "organisation"
              ? "This organisation could not be found."
              : "This executive could not be found in the selected organisation.";
        } else if (requestError instanceof Error) {
          message = requestError.message;
        }

        setErrorState({ key: requestKey, message });
      });

    return () => {
      active = false;
    };
  }, [attempt, executiveId, organisationId, requestKey, router]);

  const breadcrumbs = [
    { label: "Organisations", href: "/dashboard/organisations" },
    {
      label: detail?.organisation.name ?? "Organisation",
      href: `/dashboard/organisations/${encodeURIComponent(organisationId)}`,
    },
    { label: detail?.executive.fullName ?? "Executive" },
  ];

  if (!detail && !error) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <div className="grid min-h-[42vh] place-items-center">
          <p
            role="status"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 size={16} className="animate-spin" />
            Loading executive
          </p>
        </div>
      </PageShell>
    );
  }

  if (error || !detail) {
    return (
      <PageShell breadcrumbs={breadcrumbs}>
        <Card className="flex flex-col items-start justify-between gap-4 rounded-2xl border-0 bg-card p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <TriangleAlert size={18} className="mt-0.5 text-destructive" />
            <div>
              <h1 className="text-base font-bold">Executive unavailable</h1>
              <p role="alert" className="mt-1 text-sm text-muted-foreground">
                {error || "Unable to load this executive."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setErrorState(null);
              setAttempt((value) => value + 1);
            }}
          >
            <RefreshCw size={15} />
            Try again
          </Button>
        </Card>
      </PageShell>
    );
  }

  const { organisation, executive } = detail;

  return (
    <PageShell breadcrumbs={breadcrumbs}>
      <Card className="flex flex-col justify-between gap-5 rounded-2xl border-0 bg-card p-5 sm:flex-row sm:items-center sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            className="size-14 shrink-0 rounded-2xl after:rounded-2xl"
            aria-hidden="true"
          >
            <AvatarFallback className="rounded-2xl bg-[hsl(var(--brand-atlas-navy))] text-sm font-bold text-white">
              {getInitials(executive.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
                {executive.fullName}
              </h1>
              <Badge variant="outline" className={statusTone(executive.status)}>
                {executive.status.charAt(0).toUpperCase() +
                  executive.status.slice(1)}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Executive at{" "}
              <Link
                href={`/dashboard/organisations/${encodeURIComponent(organisationId)}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {organisation.name}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays size={15} />
            Joined {formatDate(executive.createdAt, "Unknown")}
          </div>
          {executive.status === "suspended" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => {
                setStatusActionError("");
                setPendingStatusAction("reactivate");
              }}
            >
              <RotateCcw size={15} />
              Reactivate executive
            </Button>
          ) : executive.status !== "deactivated" ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => {
                setStatusActionError("");
                setPendingStatusAction("suspend");
              }}
            >
              <Ban size={15} />
              Suspend executive
            </Button>
          ) : null}
        </div>
      </Card>

      {pendingStatusAction || statusActionError ? (
        <Card className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${pendingStatusAction === "suspend" ? "border-rose-200 bg-rose-50/70" : "border-emerald-200 bg-emerald-50/70"}`}>
          <div>
            <p className="text-sm font-semibold">{pendingStatusAction === "reactivate" ? `Reactivate ${executive.fullName}?` : `Suspend ${executive.fullName}?`}</p>
            <p className="mt-1 text-xs text-muted-foreground">{pendingStatusAction === "reactivate" ? "They will be able to sign in again." : "Their active sessions will end and they will not be able to sign in."}</p>
            {statusActionError ? <p role="alert" className="mt-2 text-xs font-medium text-destructive">{statusActionError}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isUpdatingStatus} onClick={() => { setPendingStatusAction(null); setStatusActionError(""); }}>Cancel</Button>
            <Button type="button" variant={pendingStatusAction === "suspend" ? "destructive" : "default"} size="sm" disabled={isUpdatingStatus} onClick={handleStatusAction}>
              {isUpdatingStatus ? <Loader2 size={15} className="animate-spin" /> : pendingStatusAction === "reactivate" ? <RotateCcw size={15} /> : <Ban size={15} />}
              {isUpdatingStatus ? (pendingStatusAction === "reactivate" ? "Reactivating…" : "Suspending…") : `Confirm ${pendingStatusAction ?? "status"}`}
            </Button>
          </div>
        </Card>
      ) : null}

      <section
        aria-label="Executive details"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard label="Credit balance">
          <span className="flex items-center gap-2 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">
            <CircleDollarSign
              size={19}
              className="text-emerald-700 dark:text-emerald-400"
            />
            {formatNumber(executive.creditBalance)}
          </span>
        </StatCard>
        <StatCard label="Party ID">
          <span className="font-[family-name:var(--font-manrope)] text-xl font-extrabold">
            {executive.partyId || "Not assigned"}
          </span>
        </StatCard>
        <StatCard label="Last sign-in">
          <span className="font-[family-name:var(--font-manrope)] text-lg font-bold">
            {formatDate(executive.lastSignInAt)}
          </span>
        </StatCard>
        <StatCard label="Member ID">
          <span
            className="block truncate font-mono text-xs font-medium"
            title={executive.memberId}
          >
            {executive.memberId}
          </span>
        </StatCard>
      </section>

      <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <UserRound size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold">Contact and positions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Account details for this organisation executive
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-x-8 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          <div className="flex items-start gap-3 py-3 first:pt-0 sm:border-b sm:border-border">
            <Mail size={16} className="mt-0.5 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all text-sm font-medium">
                {executive.email}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 py-3 sm:border-b sm:border-border">
            <Phone size={16} className="mt-0.5 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-sm font-medium">
                {executive.phone || "Not provided"}
              </dd>
            </div>
          </div>
          <div className="py-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Positions</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {executive.positions.length ? (
                executive.positions.map((position) => (
                  <Badge key={position} variant="secondary">
                    {position}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No positions assigned
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>
    </PageShell>
  );
}
