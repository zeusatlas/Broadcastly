import {
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings2,
  TriangleAlert,
  Waypoints,
} from "lucide-react";

export const platformAdminNavigation = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Organisations",
        href: "/dashboard/organisations",
        icon: Building2,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Credits and payments",
        href: "/dashboard/credits-payments",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Integrations",
        href: "/dashboard/integrations",
        icon: Waypoints,
      },
      {
        label: "Jobs and errors",
        href: "/dashboard/jobs-errors",
        icon: TriangleAlert,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        label: "Audit log",
        href: "/dashboard/audit-log",
        icon: ClipboardList,
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings2,
      },
    ],
  },
] as const;

export const platformAdminSections: Record<
  string,
  { title: string; description: string }
> = {
  organisations: {
    title: "Organisations",
    description:
      "Review organisation status, primary contacts, members and credit balances.",
  },
  "credits-payments": {
    title: "Credits and payments",
    description:
      "Review provider references, payment status, credit ledger entries and reasoned adjustments.",
  },
  integrations: {
    title: "Integrations",
    description:
      "Monitor SMS gateway, payment provider and email service connections and recent errors.",
  },
  "jobs-errors": {
    title: "Jobs and errors",
    description:
      "Investigate failed background jobs and integration errors, and safely retry eligible work.",
  },
  "audit-log": {
    title: "Audit log",
    description:
      "Review and export auditable organisation, provider, access and credit activity.",
  },
  settings: {
    title: "Settings",
    description:
      "Manage platform import limits, notification settings and platform administrator roles.",
  },
};
