"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CirclePlus,
  Search,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  formatCredits,
  organisations as initialOrganisations,
  type Organisation,
  type OrganisationStatus,
} from "@/lib/organisations";

type Filter = "All" | OrganisationStatus;
type AdminRole = "Chairman" | "Administrator";

function StatusBadge({ status }: { status: OrganisationStatus }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "Active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }
    >
      <span
        className={`mr-1.5 size-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {status}
    </Badge>
  );
}

export function OrganisationsPage() {
  const [organisations, setOrganisations] = useState(initialOrganisations);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>("Administrator");

  const filteredOrganisations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return organisations.filter((organisation) => {
      const matchesStatus = filter === "All" || organisation.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        [
          organisation.name,
          organisation.primaryContact,
          organisation.contactEmail,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [filter, organisations, query]);

  function createOrganisation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("organisationName") ?? "").trim();
    const adminName = String(formData.get("adminName") ?? "").trim();
    const adminEmail = String(formData.get("adminEmail") ?? "").trim();
    if (!name || !adminName || !adminEmail) return;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const newOrganisation: Organisation = {
      id: `${slug}-${Date.now()}`,
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join(""),
      status: "Active",
      primaryContact: adminName,
      contactEmail: adminEmail,
      primaryRole: adminRole,
      previewOnly: true,
      members: 1,
      creditBalance: 0,
      joined: "Just now",
      structure: { units: 0, pollingStations: 0, executives: 0 },
      broadcasts: [],
    };

    setOrganisations((current) => [newOrganisation, ...current]);
    setQuery("");
    setFilter("All");
    setSheetOpen(false);
    event.currentTarget.reset();
  }

  const filters: Filter[] = ["All", "Active", "Suspended"];

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">
            Workspace
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">
            Organisations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Review organisation access, contacts, membership and available credits.
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <Button onClick={() => setSheetOpen(true)} className="gap-2">
            <CirclePlus size={16} /> Add organisation
          </Button>
          <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 overflow-y-auto p-0">
            <SheetHeader className="border-b border-border p-6 pr-14">
              <div className="mb-3 grid size-10 place-items-center rounded-xl bg-[hsl(var(--brand-warning-amber)/.2)] text-[hsl(var(--brand-atlas-navy))]">
                <Building2 size={19} />
              </div>
              <SheetTitle className="text-xl font-bold">Add an organisation</SheetTitle>
              <SheetDescription className="leading-relaxed">
                Set up the organisation and invite its first chairman or administrator.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={createOrganisation} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-5 p-6">
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
                  Preview mode: the new organisation appears in this list for this session only.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organisation-name">Organisation name</Label>
                  <Input id="organisation-name" name="organisationName" placeholder="e.g. Northstar Community" required autoFocus />
                </div>
                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">First administrator</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">They will receive an invitation to join this organisation.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Full name</Label>
                  <Input id="admin-name" name="adminName" placeholder="Enter their name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email address</Label>
                  <Input id="admin-email" name="adminEmail" type="email" placeholder="name@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-role">Initial role</Label>
                  <Select value={adminRole} onValueChange={(value) => value && setAdminRole(value as AdminRole)}>
                    <SelectTrigger id="admin-role" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Chairman">Chairman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-auto flex justify-end gap-2 border-t border-border bg-card p-5">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" className="gap-2"><Check size={15} /> Create and invite</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search organisations"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or primary contact"
              className="h-10 pl-9"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <div role="group" aria-label="Filter organisations by status" className="flex items-center gap-1 rounded-xl bg-[hsl(var(--brand-stone))] p-1">
              {filters.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={filter === item ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                  className={filter === item ? "bg-white text-[hsl(var(--brand-atlas-navy))] shadow-sm hover:bg-white hover:text-[hsl(var(--brand-atlas-navy))]" : "text-muted-foreground"}
                >
                  {item}
                </Button>
              ))}
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground xl:inline-flex">
              <ArrowDownUp size={13} /> Updated recently
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
              <TableHead className="min-w-[240px] pl-5 text-[11px] font-semibold text-muted-foreground">Organisation</TableHead>
              <TableHead className="min-w-[210px] text-[11px] font-semibold text-muted-foreground">Primary contact</TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-muted-foreground">Members</TableHead>
              <TableHead className="min-w-[155px] text-right text-[11px] font-semibold text-muted-foreground">Credit balance</TableHead>
              <TableHead className="text-[11px] font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="pr-5"><span className="sr-only">Open organisation</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrganisations.map((organisation) => {
              const identity = (
                <>
                  <Avatar className="size-9 rounded-xl after:rounded-xl" aria-hidden="true">
                    <AvatarFallback className="rounded-xl bg-[hsl(var(--brand-atlas-navy))] text-[10px] font-bold text-white">{organisation.initials}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground group-hover:text-[hsl(var(--brand-atlas-navy))]">{organisation.name}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">Added {organisation.joined}</span>
                  </span>
                </>
              );

              return (
              <TableRow key={organisation.id} className="group">
                <TableCell className="py-4 pl-5">
                  {organisation.previewOnly ? (
                    <div className="flex min-w-0 items-center gap-3">{identity}</div>
                  ) : (
                    <Link href={`/dashboard/organisations/${organisation.id}`} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{identity}</Link>
                  )}
                </TableCell>
                <TableCell>
                  <span className="block text-xs font-medium">{organisation.primaryContact}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{organisation.contactEmail}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 text-xs tabular-nums"><UsersRound size={14} className="text-muted-foreground" />{organisation.members}</span>
                </TableCell>
                <TableCell className="text-right text-xs font-medium tabular-nums">{formatCredits(organisation.creditBalance)}</TableCell>
                <TableCell><StatusBadge status={organisation.status} /></TableCell>
                <TableCell className="pr-5 text-right">
                  {!organisation.previewOnly && <Link href={`/dashboard/organisations/${organisation.id}`} aria-label={`View ${organisation.name}`} className="inline-grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--brand-stone))] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <ArrowRight size={16} />
                  </Link>}
                </TableCell>
              </TableRow>
              );
            })}
            {filteredOrganisations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-44 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center">
                    <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--brand-stone))] text-muted-foreground"><Search size={18} /></span>
                    <p className="mt-3 text-sm font-semibold">No organisations found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try another name or change the status filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {filteredOrganisations.length} sample {filteredOrganisations.length === 1 ? "organisation" : "organisations"} of 128 total</span>
          <span className="inline-flex items-center gap-1.5"><ChevronDown size={13} /> Preview records</span>
        </div>
      </Card>
    </div>
  );
}
