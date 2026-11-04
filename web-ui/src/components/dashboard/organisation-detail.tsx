"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Building2, CalendarDays, CircleDollarSign, Loader2, RefreshCw, RotateCcw, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { OrganisationBroadcasts } from "@/components/dashboard/organisation-broadcasts";
import { OrganisationExecutives } from "@/components/dashboard/organisation-executives";
import { ApiError, platformApi, type PlatformOrganisation } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function StatusBadge({ status }: { status: PlatformOrganisation["status"] }) {
  const tone = status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "suspended"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-slate-100 text-slate-700";
  return <Badge variant="outline" className={tone}><span className={`mr-1.5 size-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : status === "suspended" ? "bg-rose-500" : "bg-slate-400"}`} />{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export function OrganisationDetail({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<{ id: string; organisation: PlatformOrganisation } | null>(null);
  const [requestError, setRequestError] = useState<{ id: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "suspend" | "reactivate" | null
  >(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState("");
  const organisation = record?.id === organisationId ? record.organisation : null;
  const error = requestError?.id === organisationId ? requestError.message : "";

  async function handleStatusAction() {
    if (!pendingStatusAction) return;
    const action = pendingStatusAction;
    setIsUpdatingStatus(true);
    setStatusActionError("");
    try {
      const response = await withAuthenticatedSession((accessToken) =>
        action === "suspend"
          ? platformApi.suspendOrganisation(accessToken, organisationId)
          : platformApi.reactivateOrganisation(accessToken, organisationId),
      );
      setRecord({ id: organisationId, organisation: response.data });
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
          : `Unable to ${action} this organisation.`,
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  useEffect(() => {
    let active = true;
    void withAuthenticatedSession((accessToken) => platformApi.getOrganisation(accessToken, organisationId))
      .then((response) => {
        if (active) {
          setRecord({ id: organisationId, organisation: response.data });
          setRequestError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          clearTokens();
          router.replace("/auth/login");
          return;
        }
        setRequestError({
          id: organisationId,
          message: requestError instanceof ApiError && requestError.status === 404
            ? "This organisation could not be found. It may have been removed."
            : requestError instanceof Error ? requestError.message : "Unable to load this organisation.",
        });
      })
      .finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, [attempt, organisationId, router]);

  if (!organisation && (!error || isLoading)) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-[1280px] space-y-8">
        <DashboardBreadcrumbs items={[{ label: "Organisations", href: "/dashboard/organisations" }, { label: "Organisation" }]} />
        <div className="grid min-h-[42vh] place-items-center">
          <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Loading organisation…</p>
        </div>
      </div>
    );
  }

  if (error || !organisation) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-[1280px] space-y-6">
        <DashboardBreadcrumbs items={[{ label: "Organisations", href: "/dashboard/organisations" }, { label: "Organisation" }]} />
        <Card className="flex flex-col items-start justify-between gap-4 rounded-2xl border-0 bg-card p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><TriangleAlert size={18} className="mt-0.5 text-destructive" /><div><h1 className="text-base font-bold">Organisation unavailable</h1><p role="alert" className="mt-1 text-sm text-muted-foreground">{error || "Unable to load this organisation."}</p></div></div>
          <Button type="button" variant="outline" onClick={() => { setRequestError(null); setIsLoading(true); setAttempt((value) => value + 1); }}><RefreshCw size={15} />Try again</Button>
        </Card>
      </div>
    );
  }

  const metrics = [
    { label: "Members", value: organisation.memberCount, icon: UsersRound, tone: "bg-sky-100 text-sky-700" },
    { label: "Executives", value: organisation.executiveCount, icon: UserRound, tone: "bg-violet-100 text-violet-700" },
    { label: "Credit balance", value: organisation.credits?.balance ?? 0, icon: CircleDollarSign, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Available credits", value: organisation.credits?.available ?? 0, icon: Building2, tone: "bg-amber-100 text-amber-800" },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1280px] space-y-7">
      <DashboardBreadcrumbs items={[
        { label: "Organisations", href: "/dashboard/organisations" },
        { label: organisation.name },
      ]} />

      <Card className="flex flex-col justify-between gap-5 rounded-2xl border-0 bg-card p-5 sm:flex-row sm:items-center sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="size-14 shrink-0 rounded-2xl after:rounded-2xl" aria-hidden="true"><AvatarFallback className="rounded-2xl bg-[hsl(var(--brand-atlas-navy))] text-sm font-bold text-white">{getInitials(organisation.name)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5"><h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">{organisation.name}</h1><StatusBadge status={organisation.status} /></div>
            <p className="mt-1.5 text-sm capitalize text-muted-foreground">{organisation.type.replace(/_/g, " ")} organisation</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={15} />Added {formatDate(organisation.createdAt)}</div>
          {organisation.status === "suspended" ? (
            <Button type="button" variant="outline" size="sm" disabled={isUpdatingStatus} onClick={() => { setStatusActionError(""); setPendingStatusAction("reactivate"); }}>
              <RotateCcw size={15} />Reactivate organisation
            </Button>
          ) : organisation.status === "active" ? (
            <Button type="button" variant="destructive" size="sm" disabled={isUpdatingStatus} onClick={() => { setStatusActionError(""); setPendingStatusAction("suspend"); }}>
              <Ban size={15} />Suspend organisation
            </Button>
          ) : null}
        </div>
      </Card>

      {pendingStatusAction || statusActionError ? (
        <Card className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${pendingStatusAction === "suspend" ? "border-rose-200 bg-rose-50/70" : "border-emerald-200 bg-emerald-50/70"}`}>
          <div>
            <p className="text-sm font-semibold">{pendingStatusAction === "reactivate" ? `Reactivate ${organisation.name}?` : `Suspend ${organisation.name}?`}</p>
            <p className="mt-1 text-xs text-muted-foreground">{pendingStatusAction === "reactivate" ? "The organisation’s executives can sign in again, subject to their individual account status." : "All executives will be signed out and unable to sign in until the organisation is reactivated."}</p>
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

      <section aria-label="Organisation totals" className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, tone }) => {
          const card = (
            <Card className={`h-full rounded-2xl border-0 bg-card p-5 transition-all ${label === "Credit balance" ? "group-hover:-translate-y-0.5 group-hover:shadow-lg" : ""}`}>
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon size={17} /></span></div>
              <p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">{formatNumber(value)}</p>
              {label === "Credit balance" ? (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--brand-atlas-navy))]">
                  View credit history<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              ) : null}
            </Card>
          );

          return label === "Credit balance" ? (
            <Link
              key={label}
              href={`/dashboard/organisations/${encodeURIComponent(organisationId)}/credit-history`}
              aria-label={`View ${organisation.name} credit history`}
              className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </section>

      <OrganisationBroadcasts key={`broadcasts-${organisationId}`} organisationId={organisationId} />
      <OrganisationExecutives key={organisationId} organisationId={organisationId} />
    </div>
  );
}
