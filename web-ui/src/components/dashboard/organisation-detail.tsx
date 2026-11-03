"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  MapPinned,
  MessageSquareText,
  ShieldAlert,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  type Organisation,
  type OrganisationStatus,
} from "@/lib/organisations";

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

export function OrganisationDetail({ organisation }: { organisation: Organisation }) {
  const [status, setStatus] = useState(organisation.status);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reason, setReason] = useState("");
  const nextStatus: OrganisationStatus = status === "Active" ? "Suspended" : "Active";

  function applyStatusChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    setStatus(nextStatus);
    setReason("");
    setSheetOpen(false);
  }

  const structure = [
    { label: "Members", value: organisation.members, icon: UsersRound },
    { label: "Units", value: organisation.structure.units, icon: Building2 },
    { label: "Polling stations", value: organisation.structure.pollingStations, icon: MapPinned },
    { label: "Executives", value: organisation.structure.executives, icon: UserRoundCog },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <Link href="/dashboard/organisations" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft size={15} /> All organisations
      </Link>

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <Avatar className="size-14 rounded-2xl after:rounded-2xl" aria-hidden="true">
            <AvatarFallback className="rounded-2xl bg-[hsl(var(--brand-atlas-navy))] text-sm font-bold text-white">{organisation.initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">{organisation.name}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">Organisation profile · Added {organisation.joined}</p>
          </div>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <Button
            variant={status === "Active" ? "outline" : "default"}
            onClick={() => setSheetOpen(true)}
            className={status === "Active" ? "border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" : ""}
          >
            <ShieldAlert size={16} />
            {status === "Active" ? "Suspend organisation" : "Reactivate organisation"}
          </Button>
          <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 p-0">
            <SheetHeader className="border-b border-border p-6 pr-14">
              <div className={`mb-3 grid size-10 place-items-center rounded-xl ${nextStatus === "Suspended" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                <ShieldAlert size={19} />
              </div>
              <SheetTitle className="text-xl font-bold">{nextStatus === "Suspended" ? "Suspend this organisation?" : "Reactivate this organisation?"}</SheetTitle>
              <SheetDescription className="leading-relaxed">
                {nextStatus === "Suspended"
                  ? "Members will lose access to organisation features while it is suspended. Record a reason for the audit trail."
                  : "This organisation and its members will regain access. Record a reason for the audit trail."}
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={applyStatusChange} className="flex flex-1 flex-col">
              <div className="space-y-2 p-6">
                <Label htmlFor="status-reason">Reason</Label>
                <Input
                  id="status-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={nextStatus === "Suspended" ? "Why is this organisation being suspended?" : "Why is this organisation being reactivated?"}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">A reason is required and will be included in the audit record.</p>
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">Preview mode: this change is local to this page and is not saved to a live platform.</p>
              </div>
              <div className="mt-auto flex justify-end gap-2 border-t border-border bg-card p-5">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button type="submit" variant={nextStatus === "Suspended" ? "destructive" : "default"} className="gap-2"><Check size={15} /> Confirm {nextStatus.toLowerCase()}</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {structure.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-2xl border-0 bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={17} className="text-muted-foreground" />
            </div>
            <p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
        <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold">Recent broadcasts</h2>
              <p className="mt-1 text-xs text-muted-foreground">Latest messaging activity for this organisation.</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><MessageSquareText size={18} /></span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                <TableHead className="pl-5 text-[11px] font-semibold text-muted-foreground">Broadcast</TableHead>
                <TableHead className="text-right text-[11px] font-semibold text-muted-foreground">Recipients</TableHead>
                <TableHead className="pr-5 text-right text-[11px] font-semibold text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organisation.broadcasts.map((broadcast) => (
                <TableRow key={`${broadcast.title}-${broadcast.date}`}>
                  <TableCell className="py-4 pl-5">
                    <p className="text-xs font-semibold">{broadcast.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 size={11} />{broadcast.date}</p>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{broadcast.sent}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <Badge variant="outline" className={broadcast.status === "Delivered" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{broadcast.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {organisation.broadcasts.length === 0 && (
                <TableRow><TableCell colSpan={3} className="h-28 text-center text-xs text-muted-foreground">No broadcasts have been recorded yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">Sample activity for preview purposes</p>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CircleDollarSign size={18} /></span>
              <div>
                <h2 className="text-sm font-bold">Credit balance</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Available for messaging</p>
              </div>
            </div>
            <p className="mt-5 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight">{formatCredits(organisation.creditBalance)}</p>
            <Link href="/dashboard/credits-payments" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline">View credit activity <ArrowLeft className="rotate-180" size={13} /></Link>
          </Card>

          <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold">Primary contact</h2>
            <div className="mt-4 flex items-center gap-3">
              <Avatar className="size-10"><AvatarFallback className="bg-[hsl(var(--brand-stone))] text-xs font-bold text-foreground">{organisation.initials}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{organisation.primaryContact}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{organisation.primaryRole ? `${organisation.primaryRole} · ` : ""}{organisation.contactEmail}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <p className="-mt-5 text-[10px] text-muted-foreground">Preview organisation profile. Changes and records on this page are sample data.</p>
    </div>
  );
}
