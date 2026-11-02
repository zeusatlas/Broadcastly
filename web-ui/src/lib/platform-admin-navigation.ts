import {
  Building2,
  ClipboardList,
  CreditCard,
  FileUp,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export const platformAdminNavigation = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Organisations", href: "/dashboard/organisations", icon: Building2 },
      { label: "Accounts & access", href: "/dashboard/accounts", icon: UsersRound },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Broadcast oversight", href: "/dashboard/broadcasts", icon: MessageSquareText },
      { label: "Credits & payments", href: "/dashboard/credits", icon: CreditCard },
      { label: "Imports", href: "/dashboard/imports", icon: FileUp },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "SMS providers", href: "/dashboard/sms-providers", icon: Settings2 },
      { label: "System health", href: "/dashboard/system-health", icon: Gauge },
      { label: "Audit log", href: "/dashboard/audit-log", icon: ClipboardList },
      { label: "Security & support", href: "/dashboard/security-support", icon: ShieldCheck },
    ],
  },
] as const;

export const platformAdminSections: Record<string, { title: string; description: string }> = {
  organisations: { title: "Organisations", description: "Review and support the organisations configured on the platform." },
  accounts: { title: "Accounts & access", description: "Support account status, access issues and authorised platform-level administration." },
  broadcasts: { title: "Broadcast oversight", description: "Review broadcast operations and investigate authorised support requests." },
  credits: { title: "Credits & payments", description: "Review credit activity, allocations and payment integration status." },
  imports: { title: "Imports", description: "Monitor spreadsheet import activity and help resolve processing issues." },
  "sms-providers": { title: "SMS providers", description: "Configure SMS provider connections and sender settings for the platform." },
  "system-health": { title: "System health", description: "Monitor platform services, background processing and integration availability." },
  "audit-log": { title: "Audit log", description: "Review recorded administrative and security events for authorised operational needs." },
  "security-support": { title: "Security & support", description: "Handle authorised support workflows and review security-related operations." },
  settings: { title: "Platform settings", description: "Manage platform-wide configuration and operational preferences." },
};
