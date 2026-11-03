"use client";

import { useState, type FormEvent } from "react";
import {
  Bell,
  FileCog,
  HardDriveUpload,
  Mail,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
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

type AdminRole = "Super Admin" | "Support" | "Finance";
type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "Active" | "Invitation pending";
  self?: boolean;
};

const initialTeam: TeamMember[] = [
  { id: "admin-1", name: "Maya Owusu", email: "maya.owusu@example.com", role: "Super Admin", status: "Active", self: true },
  { id: "admin-2", name: "Daniel Asante", email: "daniel.asante@example.com", role: "Finance", status: "Active" },
  { id: "admin-3", name: "Leila Mensah", email: "leila.mensah@example.com", role: "Support", status: "Active" },
  { id: "admin-4", name: "Kwame Badu", email: "kwame.badu@example.com", role: "Support", status: "Invitation pending" },
];

const initialNotifications = {
  security: true,
  payments: true,
  service: true,
  digest: false,
};

export default function SettingsPage() {
  const [maxFileSize, setMaxFileSize] = useState("25");
  const [maxRows, setMaxRows] = useState("10000");
  const [fileTypes, setFileTypes] = useState({ csv: true, xlsx: true });
  const [notifications, setNotifications] = useState(initialNotifications);
  const [team, setTeam] = useState(initialTeam);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteRole, setInviteRole] = useState<AdminRole>("Support");
  const [notice, setNotice] = useState("");

  const superAdminCount = team.filter((member) => member.role === "Super Admin").length;

  function savePreview(section: string) {
    setNotice(`${section} saved in this preview. Changes are not connected to a live platform.`);
  }

  function inviteAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("adminName") ?? "").trim();
    const email = String(formData.get("adminEmail") ?? "").trim();
    if (!name || !email) return;
    setTeam((current) => [{
      id: `admin-${Date.now()}`,
      name,
      email,
      role: inviteRole,
      status: "Invitation pending",
    }, ...current]);
    event.currentTarget.reset();
    setInviteOpen(false);
    setNotice(`Invitation prepared for ${email} in this preview. No email was sent.`);
  }

  function removeAdministrator() {
    if (!selectedMember) return;
    setTeam((current) => current.filter((member) => member.id !== selectedMember.id));
    setNotice(`${selectedMember.name} removed from the preview team. No live access changed.`);
    setSelectedMember(null);
    setRemoveOpen(false);
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
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-950">Preview mode: this adds a pending invitation to the list. No email is sent and no access is granted.</div>
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
          <Table>
            <TableHeader><TableRow className="bg-[hsl(var(--brand-stone)/.55)] hover:bg-[hsl(var(--brand-stone)/.55)]"><TableHead className="min-w-[240px] pl-5 text-[11px] font-semibold text-muted-foreground">Administrator</TableHead><TableHead className="min-w-[190px] text-[11px] font-semibold text-muted-foreground">Role</TableHead><TableHead className="min-w-[155px] text-[11px] font-semibold text-muted-foreground">Status</TableHead><TableHead className="pr-5 text-right text-[11px] font-semibold text-muted-foreground">Access</TableHead></TableRow></TableHeader>
            <TableBody>{team.map((member) => {
              const initials = member.name.split(/\s+/).map((part) => part[0]?.toUpperCase() ?? "").slice(0, 2).join("");
              const cannotRemove = member.self || (member.role === "Super Admin" && superAdminCount <= 1);
              return <TableRow key={member.id}>
                <TableCell className="py-4 pl-5"><div className="flex items-center gap-3"><Avatar className="size-9"><AvatarFallback className="bg-[hsl(var(--brand-stone))] text-[10px] font-bold text-foreground">{initials}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-xs font-semibold">{member.name}{member.self && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(you)</span>}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{member.email}</span></span></div></TableCell>
                <TableCell><Badge variant="outline" className={member.role === "Super Admin" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-border bg-background text-foreground/80"}>{member.role}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={member.status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}><span className={`mr-1.5 size-1.5 rounded-full ${member.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />{member.status}</Badge></TableCell>
                <TableCell className="pr-5 text-right">{cannotRemove ? <span className="text-[10px] text-muted-foreground">Protected</span> : <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-rose-700" onClick={() => { setSelectedMember(member); setRemoveOpen(true); }}><Trash2 size={13} /> Remove</Button>}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[10px] text-muted-foreground"><span>{team.length} sample team members</span><span>At least one Super Admin must remain</span></div>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-xs leading-relaxed text-sky-950"><FileCog size={16} className="mt-0.5 shrink-0" /><p>Settings and team changes are local preview data. Production role changes, invitations, and configuration updates should be permission-checked and recorded in the audit log.</p></div>

      <Sheet open={removeOpen} onOpenChange={(open) => { setRemoveOpen(open); if (!open) setSelectedMember(null); }}>
        <SheetContent side="right" className="w-[min(100vw,34rem)] gap-0 p-0">
          <SheetHeader className="border-b border-border p-6 pr-14"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><Trash2 size={18} /></div><SheetTitle className="text-xl font-bold">Remove administrator?</SheetTitle><SheetDescription>They will no longer have access to the platform admin workspace.</SheetDescription></SheetHeader>
          {selectedMember && <div className="space-y-5 p-6"><div className="rounded-xl bg-[hsl(var(--brand-stone))] p-4"><p className="text-sm font-semibold">{selectedMember.name}</p><p className="mt-1 text-xs text-muted-foreground">{selectedMember.email} · {selectedMember.role}</p></div><p className="text-xs leading-relaxed text-muted-foreground">This preview removes the person from the visible team list only. It does not change live access.</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setRemoveOpen(false); setSelectedMember(null); }}>Cancel</Button><Button variant="destructive" onClick={removeAdministrator} className="gap-2"><Trash2 size={14} /> Remove from preview</Button></div></div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
