import { approvalsEndpoints } from '@/features/approvals/api/approvals_api';
import { authEndpoints } from '@/features/auth/api/auth_api';
import { broadcastsEndpoints } from '@/features/broadcasts/api/broadcasts_api';
import { templatesEndpoints } from '@/features/broadcasts/api/templates_api';
import { creditsEndpoints } from '@/features/credits/api/credits_api';
import { dashboardEndpoints } from '@/features/dashboard/api/dashboard_api';
import { memberImportEndpoints } from '@/features/members/api/member_import_api';
import { membersEndpoints } from '@/features/members/api/members_api';
import { notificationsEndpoints } from '@/features/notifications/api/notifications_api';
import { organisationEndpoints } from '@/features/organisation/api/organisation_api';
import { reportsEndpoints } from '@/features/reports/api/reports_api';

// The single entry point for every backend call:
//   import { api } from '@/lib/api/apiSlice';
//   const { data, message } = await api.members.create(body);
// Each feature defines its endpoints in features/<domain>/api/<domain>_api.ts and registers them here.
// The one file in lib/ allowed to import features. Not re-exported from @/lib/api, which the
// endpoint files themselves import — that would be a circular import.
export const api = {
  auth: authEndpoints,
  dashboard: dashboardEndpoints,
  organisation: organisationEndpoints,
  members: membersEndpoints,
  memberImports: memberImportEndpoints,
  broadcasts: broadcastsEndpoints,
  templates: templatesEndpoints,
  approvals: approvalsEndpoints,
  credits: creditsEndpoints,
  reports: reportsEndpoints,
  notifications: notificationsEndpoints,
};
