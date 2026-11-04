"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CreditCard,
  Users,
  UserRoundCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError, platformApi } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";
import { useApiResource } from "@/hooks/use-api-resource";

const numberFormat = new Intl.NumberFormat("en-GH");
const currencyFormat = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
});

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatGhs(pesewas: number) {
  return currencyFormat.format(pesewas / 100);
}

export function DashboardOverview() {
  const router = useRouter();
  const loadOverview = useCallback(
    async () =>
      (await withAuthenticatedSession((accessToken) =>
        platformApi.getOverview(accessToken),
      )).data,
    [],
  );
  const handleRequestError = useCallback((requestError: unknown) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      clearTokens();
      router.replace("/auth/login");
      return true;
    }
    return false;
  }, [router]);
  const { data: overview, error, isLoading, refresh } = useApiResource(
    loadOverview,
    { errorMessage: "Unable to load dashboard totals.", onError: handleRequestError },
  );

  const metrics = overview
    ? [
        {
          label: "Organisations",
          value: formatNumber(overview.organisations),
          note: `${formatNumber(overview.suspendedOrganisations)} suspended`,
          icon: Building2,
          tone: "bg-sky-100 text-sky-700",
        },
        {
          label: "Members",
          value: formatNumber(overview.members),
          note: "Across all organisations",
          icon: Users,
          tone: "bg-violet-100 text-violet-700",
        },
        {
          label: "Active executives",
          value: formatNumber(
            overview.activeChairmen + overview.activeExecutives,
          ),
          note: `${formatNumber(overview.activeChairmen)} ${overview.activeChairmen === 1 ? "chairman" : "chairmen"} · ${formatNumber(overview.activeExecutives)} ${overview.activeExecutives === 1 ? "executive" : "executives"}`,
          icon: UserRoundCheck,
          tone: "bg-emerald-100 text-emerald-700",
        },
        {
          label: "Credits purchased",
          value: formatNumber(overview.creditsPurchased),
          note: `${formatGhs(overview.amountPaidPesewas)} paid Â· all time`,
          icon: CreditCard,
          tone: "bg-amber-100 text-amber-800",
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">
            Platform administration
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform totals across organisations, members, executives and credit
            purchases.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          <Activity
            size={15}
            className="text-[hsl(var(--brand-success-green))]"
          />
          {isLoading ? "Updating totals" : "Live platform totals"}
        </div>
      </div>

      {error ? (
        <Card className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-destructive/20 bg-card p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <TriangleAlert
              size={18}
              className="mt-0.5 shrink-0 text-destructive"
            />
            <div>
              <p className="text-sm font-semibold">
                Dashboard totals could not be loaded
              </p>
              <p role="alert" className="mt-1 text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={refresh}
          >
            Try again
          </Button>
        </Card>
      ) : null}

      <section
        aria-label="Platform totals"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {isLoading && !overview
          ? Array.from({ length: 4 }, (_, index) => (
              <Card
                key={index}
                className="h-[150px] animate-pulse rounded-2xl border-0 bg-card p-5"
                aria-hidden="true"
              >
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="mt-5 h-8 w-20 rounded bg-muted" />
                <div className="mt-5 h-3 w-36 rounded bg-muted" />
              </Card>
            ))
          : metrics.map(({ label, value, note, icon: Icon, tone }) => (
              <Card
                key={label}
                className="h-full rounded-2xl border-0 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight">
                      {value}
                    </p>
                  </div>
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
                  >
                    <Icon size={20} />
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{note}</p>
              </Card>
            ))}
      </section>

      {overview ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-800">
                <TriangleAlert size={17} />
              </span>
              <h2 className="text-base font-bold">Needs attention</h2>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Accounts and purchases that may need a follow-up.
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[hsl(var(--brand-stone))] p-4">
                <dt className="text-xs text-muted-foreground">
                  Organisations without a chairman
                </dt>
                <dd className="mt-2 text-2xl font-bold">
                  {formatNumber(overview.organisationsWithoutChairman)}
                </dd>
              </div>
              <div className="rounded-xl bg-[hsl(var(--brand-stone))] p-4">
                <dt className="text-xs text-muted-foreground">
                  Suspended organisations
                </dt>
                <dd className="mt-2 text-2xl font-bold">
                  {formatNumber(overview.suspendedOrganisations)}
                </dd>
              </div>
              <div className="rounded-xl bg-[hsl(var(--brand-stone))] p-4">
                <dt className="text-xs text-muted-foreground">
                  Suspended executives
                </dt>
                <dd className="mt-2 text-2xl font-bold">
                  {formatNumber(overview.suspendedExecutives)}
                </dd>
              </div>
              <div className="rounded-xl bg-[hsl(var(--brand-stone))] p-4">
                <dt className="text-xs text-muted-foreground">
                  Pending / failed purchases
                </dt>
                <dd className="mt-2 text-2xl font-bold">
                  {formatNumber(overview.pendingPurchases)} /{" "}
                  {formatNumber(overview.failedPurchases)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <CreditCard size={17} />
              </span>
              <h2 className="text-base font-bold">Platform totals</h2>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              All time totals reported by the platform API.
            </p>
            <dl className="mt-5 divide-y divide-border">
              <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <dt className="text-sm text-muted-foreground">Amount paid</dt>
                <dd className="text-sm font-bold">
                  {formatGhs(overview.amountPaidPesewas)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-muted-foreground">
                  Platform administrators
                </dt>
                <dd className="text-sm font-bold">
                  {formatNumber(overview.platformAdmins)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4 last:pb-0">
                <dt className="text-sm text-muted-foreground">
                  Active chairmen
                </dt>
                <dd className="text-sm font-bold">
                  {formatNumber(overview.activeChairmen)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}

      {!isLoading && !error && !overview ? (
        <p role="status" className="text-sm text-muted-foreground">
          No dashboard totals are available.
        </p>
      ) : null}
    </div>
  );
}
