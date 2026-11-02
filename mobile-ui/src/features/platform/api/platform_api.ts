import { http, type RequestOptions } from '@/lib/api';
import type { Paginated } from '@/types/api';

import type {
  ListOrganisationExecutivesParams,
  ListOrganisationsParams,
  ListPlatformAdminsParams,
  OrganisationExecutiveResponse,
  OrganisationResponse,
  PlatformAdminResponse,
  PlatformOverviewResponse,
} from '../types';

// Platform admin endpoints (api/src/modules/platform). The API refuses anyone who is not a platform admin.
export const platformEndpoints = {
  readOverview: (options?: RequestOptions) =>
    http.get<PlatformOverviewResponse>('/platform/overview', options),

  readOrganisations: (params: ListOrganisationsParams, options?: RequestOptions) =>
    http.get<Paginated<OrganisationResponse>>('/platform/organisations', { ...options, params }),

  readOrganisation: ({ uuid }: { uuid: string }, options?: RequestOptions) =>
    http.get<OrganisationResponse>(`/platform/organisations/${uuid}`, options),

  readOrganisationExecutives: (
    { uuid, params }: { uuid: string; params: ListOrganisationExecutivesParams },
    options?: RequestOptions,
  ) =>
    http.get<Paginated<OrganisationExecutiveResponse>>(
      `/platform/organisations/${uuid}/executives`,
      { ...options, params },
    ),

  readPlatformAdmins: (params: ListPlatformAdminsParams, options?: RequestOptions) =>
    http.get<Paginated<PlatformAdminResponse>>('/platform/admins', { ...options, params }),
};
