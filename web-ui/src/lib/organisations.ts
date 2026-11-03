export type OrganisationStatus = "Active" | "Suspended";

export type Organisation = {
  id: string;
  name: string;
  initials: string;
  status: OrganisationStatus;
  primaryContact: string;
  contactEmail: string;
  primaryRole?: "Chairman" | "Administrator";
  previewOnly?: boolean;
  members: number;
  creditBalance: number;
  joined: string;
  structure: {
    units: number;
    pollingStations: number;
    executives: number;
  };
  broadcasts: {
    title: string;
    sent: number;
    date: string;
    status: "Delivered" | "Processing";
  }[];
};

export const organisations: Organisation[] = [
  {
    id: "northstar-community",
    name: "Northstar Community",
    initials: "NC",
    status: "Active",
    primaryContact: "Ama Mensah",
    contactEmail: "ama.mensah@example.com",
    members: 248,
    creditBalance: 18420,
    joined: "12 Oct 2025",
    structure: { units: 12, pollingStations: 48, executives: 36 },
    broadcasts: [
      { title: "Community meeting reminder", sent: 231, date: "Today, 10:42", status: "Delivered" },
      { title: "Monthly update", sent: 224, date: "Yesterday, 16:18", status: "Delivered" },
      { title: "Volunteer sign-up", sent: 198, date: "28 Oct 2026", status: "Delivered" },
    ],
  },
  {
    id: "brightpath-foundation",
    name: "BrightPath Foundation",
    initials: "BF",
    status: "Active",
    primaryContact: "Kojo Asare",
    contactEmail: "kojo.asare@example.com",
    members: 126,
    creditBalance: 9630,
    joined: "28 Nov 2025",
    structure: { units: 8, pollingStations: 26, executives: 21 },
    broadcasts: [
      { title: "Programme registration open", sent: 108, date: "Today, 09:10", status: "Delivered" },
      { title: "Workshop location update", sent: 116, date: "27 Oct 2026", status: "Delivered" },
    ],
  },
  {
    id: "riverside-association",
    name: "Riverside Association",
    initials: "RA",
    status: "Active",
    primaryContact: "Esi Owusu",
    contactEmail: "esi.owusu@example.com",
    members: 84,
    creditBalance: 5720,
    joined: "09 Jan 2026",
    structure: { units: 6, pollingStations: 18, executives: 15 },
    broadcasts: [
      { title: "Annual gathering details", sent: 77, date: "Yesterday, 13:06", status: "Delivered" },
      { title: "Member survey", sent: 80, date: "24 Oct 2026", status: "Delivered" },
    ],
  },
  {
    id: "harbour-view-network",
    name: "Harbour View Network",
    initials: "HV",
    status: "Suspended",
    primaryContact: "Yaw Boateng",
    contactEmail: "yaw.boateng@example.com",
    members: 63,
    creditBalance: 0,
    joined: "17 Feb 2026",
    structure: { units: 4, pollingStations: 14, executives: 12 },
    broadcasts: [
      { title: "Service notice", sent: 60, date: "18 Oct 2026", status: "Delivered" },
    ],
  },
  {
    id: "open-hands-collective",
    name: "Open Hands Collective",
    initials: "OH",
    status: "Active",
    primaryContact: "Nana Adjei",
    contactEmail: "nana.adjei@example.com",
    members: 41,
    creditBalance: 2180,
    joined: "03 Apr 2026",
    structure: { units: 3, pollingStations: 9, executives: 9 },
    broadcasts: [
      { title: "Distribution schedule", sent: 38, date: "Today, 08:30", status: "Processing" },
    ],
  },
];

export function formatCredits(value: number) {
  return `${new Intl.NumberFormat("en").format(value)} credits`;
}
