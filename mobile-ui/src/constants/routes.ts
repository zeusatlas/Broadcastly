import type { AccessRule } from '@/features/auth';

interface GatedRoute {
  // Route name relative to src/app/(app)/, exactly as Expo Router names it.
  name: string;
  access: AccessRule;
}

// The single map of which screen needs which access. Read by src/app/(app)/_layout.tsx.
// Client gating is UX only; the backend re-checks every request (FR-IAM-05).
export const GATED_ROUTES: readonly GatedRoute[] = [
  { name: 'broadcasts/new', access: { permission: 'broadcast.draft' } },
  { name: 'approvals/index', access: { permission: 'broadcast.approve' } },
  { name: 'members/import', access: { permission: 'member.import' } },
  { name: 'credits/allocate', access: { permission: 'credit.allocate' } },
  { name: 'organisation/index', access: { permission: 'appointment.manage' } },
  { name: 'organisation/unit/new', access: { permission: 'appointment.manage' } },
  { name: 'organisation/position/new', access: { permission: 'appointment.manage' } },
  { name: 'reports/index', access: { permission: 'report.view' } },
  { name: 'executives/index', access: { permission: 'appointment.manage' } },
  { name: 'executives/search', access: { permission: 'appointment.manage' } },
  { name: 'executives/[id]', access: { permission: 'appointment.manage' } },
  { name: 'executives/new', access: { permission: 'appointment.manage' } },
  // TODO(backend permissions): templates and opt-outs get their own permissions once the API defines them.
  { name: 'templates/index', access: { permission: 'broadcast.draft' } },
  { name: 'opt-outs/index', access: { permission: 'member.manage' } },
  { name: 'members/imports', access: { permission: 'member.import' } },
];
