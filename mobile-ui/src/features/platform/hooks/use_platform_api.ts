import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type {
  ListOrganisationExecutivesParams,
  ListOrganisationsParams,
  ListPlatformAdminsParams,
} from '../types';

export const useReadPlatformOverviewQuery = () =>
  useQuery(['platform', 'overview'], (options) => api.platform.readOverview(options));

export const useReadOrganisationsQuery = (params: ListOrganisationsParams) =>
  useQuery(['platform', 'organisations', params], (options) =>
    api.platform.readOrganisations(params, options),
  );

export const useReadOrganisationQuery = (uuid: string) =>
  useQuery(['platform', 'organisation', uuid], (options) =>
    api.platform.readOrganisation({ uuid }, options),
  );

export const useReadOrganisationExecutivesQuery = (
  uuid: string,
  params: ListOrganisationExecutivesParams,
) =>
  useQuery(['platform', 'organisation', uuid, 'executives', params], (options) =>
    api.platform.readOrganisationExecutives({ uuid, params }, options),
  );

export const useReadPlatformAdminsQuery = (params: ListPlatformAdminsParams) =>
  useQuery(['platform', 'admins', params], (options) =>
    api.platform.readPlatformAdmins(params, options),
  );
