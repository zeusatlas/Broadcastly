"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileCog,
  HardDriveUpload,
  Loader2,
  Mail,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useApiResource } from "@/hooks/use-api-resource";
import { usePagination } from "@/hooks/use-pagination";
import { ApiError, platformApi } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";

type AdminRole = "Super Admin" | "Support" | "Finance";

const initialNotifications = {
  security: true,
  payments: true,
  service: true,
  digest: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const [maxFileSize, setMaxFileSize] = useState("25");
  const [maxRows, setMaxRows] = useState("10000");
  const [fileTypes, setFileTypes] = useState({ csv: true, xlsx: true });
  const [notifications, setNotifications] = useState(initialNotifications);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<AdminRole>("Support");
  const [notice, setNotice] = useState("");
  const pagination = usePagination(20);
  const { page, setPage, updatePageInfo } = pagination;
  const loadAdmins = useCallback(
    async () =>
      (
        await withAuthenticatedSession((accessToken) =>
          platformApi.listPlatformAdmins(accessToken, { page, pageSize: 20 }),
        )
      ).data,
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
  const { data: adminData, error: adminError, isLoading, refresh } = useApiResource(
    loadAdmins,
    { errorMessage: "Unable to load platform administrators.", onError: handleRequestError },
  );
  const admins = adminData?.items ?? [];

  useEffect(() => {
    if (adminData) updatePageInfo(adminData);
  }, [adminData, updatePageInfo]);

  function savePreview(section: string) {
    setNotice(`${section} saved in this preview. Changes are not connected to a live platform.`);
  }

  function inviteAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("adminName") ?? "").trim();
    const email = String(formData.get("adminEmail") ?? "").trim();
    if (!name || !email) return;
    event.currentTarget.reset();
    setInviteOpen(false);
    setNotice(`Invitation prepared for ${email} as ${inviteRole}. No email was sent.`);
  }

  function toggleFileType(type: "csv" | "xlsx", checked: boolean) {
    setFileTypes((current) => ({ ...current, [type]: checked }));
  }

  function toggleNotification(key: keyof typeof initialNotifications, checked: boolean) {
    setNotifications((current) => ({ ...current, [key]: checked }));
  }

  const notificationSettings = [
    { key: "security" as const, title: "Security and access alerts", description: "Role changes, invitations, and account access events.", icon: ShieldCheck },
    { key: "payments" as const, title: "Payment and credit alerts", description: "Pending verification, failed payments, and ledger adjustments.", icon: Bell },
    { key: "service" as const, title: "Service incident alerts", description: "Provider outages and background job failures.", icon: Settings2 },
    { key: "digest" as const, title: "Daily operations summary", description: "A daily email with platform activity and unresolved issues.", icon: Mail },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))]">Governance</p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Configure platform import rules, notifications, and administrator access.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          <Settings2 size={14} /> Preview configuration
        </div>
      </div>

      {notice && <div role="status" className="flex flex-col justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950 sm:flex-row sm:items-center"><span>{notice}</span><Button variant="ghost" size="sm" className="w-fit text-sky-950 hover:bg-sky-100" onClick={() => setNotice("")}>Dismiss</Button></div>}

      <section aria-labelledby="import-settings-heading">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-700"><HardDriveUpload size={17} /></span>
          <div><h2 id="import-settings-heading" className="text-base font-bold">Import limits</h2><p className="mt-1 text-xs text-muted-foreground">Set upload rules for organisation data imports.</p></div>
        </div>
        <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,.7fr)]">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="max-file-size">Maximum file size</Label><div className="relative"><Input id="max-file-size" type="number" min="1" max="500" value={maxFileSize} onChange={(event) => setMaxFileSize(event.target.value)} className="pr-12" /><span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">MB</span></div><p className="text-[10px] text-muted-foreground">Files above this size will be rejected.</p></div>
              <div className="space-y-2"><Label htmlFor="max-rows">Maximum rows per file</Label><Input id="max-rows" type="number" min="1" max="1000000" value={maxRows} onChange={(event) => setMaxRows(event.target.value)} /><p className="text-[10px] text-muted-foreground">Includes the header row.</p></div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Allowed file types</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:bg-[hsl(var(--brand-stone)/.5)]">
                <Checkbox checked={fileTypes.csv} onCheckedChange={(checked) => toggleFileType("csv", checked === true)} aria-label="Allow CSV files" />
                <span><span className="block text-xs font-semibold">CSV files</span><span className="mt-1 block text-[10px] text-muted-foreground">Comma-separated values (.csv)</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:bg-[hsl(var(--brand-stone)/.5)]">
                <Checkbox checked={fileTypes.xlsx} onCheckedChange={(checked) => toggleFileType("xlsx", checked === true)} aria-label="Allow Excel files" />
                <span><span className="block text-xs font-semibold">Excel workbooks</span><span className="mt-1 block text-[10px] text-muted-foreground">Office Open XML (.xlsx)</span></span>
              </label>
            </div>
          </div>
          {!fileTypes.csv && !fileTypes.xlsx && <p role="alert" className="mt-4 text-xs font-medium text-rose-700">Enable at least one file type before saving.</p>}
          <div className="mt-6 flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
            <p className="text-[10px] text-muted-foreground">Preview values: {maxFileSize} MB · {Number(maxRows || 0).toLocaleString()} rows</p>
            <Button disabled={!fileTypes.csv && !fileTypes.xlsx} onClick={() => savePreview("Import limits")} className="gap-2"><Save size={15} /> Save import limits</Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="notification-settings-heading">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-800"><Bell size={17} /></span>
          <div><h2 id="notification-settings-heading" className="text-base font-bold">Notifications</h2><p className="mt-1 text-xs text-muted-foreground">Choose which platform events reach the admin team.</p></div>
        </div>
        <Card className="rounded-2xl border-0 bg-card p-5 sm:p-6">
          <div className="divide-y divide-border">
            {notificationSettings.map(({ key, title, description, icon: Icon }) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <span className="flex min-w-0 items-start gap-3"><span className="mt-0.5 text-muted-foreground"><Icon size={16} /></span><span className="min-w-0"><span className="block text-xs font-semibold">{title}</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{description}</span></span></span>
                <Checkbox checked={notifications[key]} onCheckedChange={(checked) => toggleNotification(key, checked === true)} aria-label={title} />
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end border-t border-border pt-5"><Button onClick={() => savePreview("Notification preferences")} className="gap-2"><Save size={15} /> Save preferences</Button></div>
        </Card>
      </section>

      <section aria-labelledby="team-heading">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><UsersRound size={17} /></span><div><h2 id="team-heading" className="text-base font-bold">Platform admin team</h2><p className="mt-1 text-xs text-muted-foreground">Manage staff who can access the platform control panel.</p></div></div>
          <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
            <Button onClick={() => setInviteOpen(true)} className="gap-2"><UserRoundPlus size={16} /> Invite administrator</Button>
            <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 overflow-y-auto p-0">
              <SheetHeader className="border-b border-border p-6 pr-14"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><UserRoundPlus size={18} /></div><SheetTitle className="text-xl font-bold">Invite a platform administrator</SheetTitle><SheetDescription>Choose an access role and prepare an invitation for the team member.</SheetDescription></SheetHeader>
              <form onSubmit={inviteAdministrator} className="flex flex-1 flex-col">
                <div className="space-y-5 p-6">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-950">Preview mode: this prepares an invitation message only. No email is sent and no access is granted.</div>
                  <div className="space-y-2"><Label htmlFor="team-admin-name">Full name</Label><Input id="team-admin-name" name="adminName" placeholder="Enter their name" required /></div>
                  <div className="space-y-2"><Label htmlFor="team-admin-email">Email address</Label><Input id="team-admin-email" name="adminEmail" type="email" placeholder="name@example.com" required /></div>
                  <div className="space-y-2"><Label htmlFor="team-admin-role">Role</Label><Select value={inviteRole} onValueChange={(value) => value && setInviteRole(value as AdminRole)}><SelectTrigger id="team-admin-role" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Super Admin">Super Admin</SelectItem><SelectItem value="Support">Support</SelectItem><SelectItem value="Finance">Finance</SelectItem></SelectContent></Select><p className="text-[10px] leading-relaxed text-muted-foreground">Super Admins can change platform settings and manage the admin team. Support and Finance roles have narrower access.</p></div>
                </div>
                <div className="mt-auto flex justify-end gap-2 border-t border-border bg-card p-5"><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit" className="gap-2"><Plus size={15} /> Prepare invitation</Button></div>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <Card className="overflow-hidden rounded-2xl border-0 bg-card p-0">
          {adminError ? (
            <div className="flex flex-col items-start justify-between gap-3 border-b border-destructive/15 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:px-5">
              <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><TriangleAlert size={16} />{adminError}</p>
              <Button type="button" size="sm" variant="outline" onClick={refresh}>Try again</Button>
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]">
                <TableHead className="min-w-[240px] pl-5 text-[11px] font-semibold text-muted-foreground">Administrator</TableHead>
                <TableHead className="min-w-[170px] text-[11px] font-semibold text-muted-foreground">Role</TableHead>
                <TableHead className="min-w-[145px] text-[11px] font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="min-w-[170px] text-[11px] font-semibold text-muted-foreground">Last sign-in</TableHead>
                <TableHead className="min-w-[155px] pr-5 text-[11px] font-semibold text-muted-foreground">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && admins.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground"><span role="status" className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Loading platform administrators</span></TableCell></TableRow>
              ) : admins.map((admin) => {
                const initials = admin.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
                return (
                  <TableRow key={admin.id}>
                    <TableCell className="py-4 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9"><AvatarFallback className="bg-[hsl(var(--brand-stone))] text-[10px] font-bold text-foreground">{initials}</AvatarFallback></Avatar>
                        <span className="min-w-0"><span className="block truncate text-xs font-semibold">{admin.fullName}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{admin.email}</span></span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">Platform admin</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={admin.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}><span className={`mr-1.5 size-1.5 rounded-full ${admin.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />{admin.status === "active" ? "Active" : "Suspended"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{admin.lastSignInAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(admin.lastSignInAt)) : "Never"}</TableCell>
                    <TableCell className="pr-5 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(admin.createdAt))}</TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && !adminError && admins.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">No platform administrators found.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] text-muted-foreground">Showing {pagination.range.first}–{pagination.range.last} of {pagination.total} platform administrators</span>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={14} />Previous</Button>
              <span aria-live="polite" className="min-w-16 text-center text-[10px] text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button type="button" size="sm" variant="outline" disabled={!pagination.hasNextPage || isLoading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={14} /></Button>
            </div>
          </div>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-xs leading-relaxed text-sky-950"><FileCog size={16} className="mt-0.5 shrink-0" /><p>The administrator table is loaded from the platform API. Other settings and invitation controls on this page are local preview data.</p></div>
    </div>
  );
}
