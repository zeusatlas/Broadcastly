import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type {
  CreateExecutiveRequest,
  CreatePositionRequest,
  CreateUnitRequest,
  ExecutiveResponse,
  ListExecutivesParams,
  ListUnitsParams,
  UpdatePositionRequest,
} from '../types';

interface ReadOptions {
  // false for callers the API would refuse, so no request is wasted.
  enabled?: boolean;
}

export const useReadOrganisationOverviewQuery = ({ enabled }: ReadOptions = {}) =>
  useQuery(['organisation', 'overview'], (options) => api.organisation.readOverview(options), {
    enabled,
  });

export const useReadPositionsQuery = ({ enabled }: ReadOptions = {}) =>
  useQuery(['organisation', 'positions'], (options) => api.organisation.readPositions(options), {
    enabled,
  });

export const useReadUnitsQuery = (params: ListUnitsParams, { enabled }: ReadOptions = {}) =>
  useQuery(
    ['organisation', 'units', params],
    (options) => api.organisation.readUnits(params, options),
    {
      enabled,
    },
  );

export const useExecutivePages = (filters: Omit<ListExecutivesParams, 'page' | 'pageSize'>) =>
  usePages<ExecutiveResponse>(`organisation-executives:${JSON.stringify(filters)}`, (page, o) =>
    api.organisation.readExecutives({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const useReadExecutivesQuery = (
  params: ListExecutivesParams,
  { enabled }: ReadOptions = {},
) =>
  useQuery(
    ['organisation', 'executives', params],
    (options) => api.organisation.readExecutives(params, options),
    { enabled },
  );

export const useReadExecutiveQuery = (executiveId: string, { enabled }: ReadOptions = {}) =>
  useQuery(
    ['organisation', 'executive', executiveId],
    (options) => api.organisation.readExecutive({ executiveId }, options),
    { enabled },
  );

export const useCreatePositionMutation = () =>
  useMutation((credentials: CreatePositionRequest) => api.organisation.createPosition(credentials));

export const useUpdatePositionMutation = () =>
  useMutation((args: { positionId: string; credentials: UpdatePositionRequest }) =>
    api.organisation.updatePosition(args),
  );

export const useCreateUnitMutation = () =>
  useMutation((credentials: CreateUnitRequest) => api.organisation.createUnit(credentials));

export const useCreateExecutiveMutation = () =>
  useMutation((credentials: CreateExecutiveRequest) =>
    api.organisation.createExecutive(credentials),
  );

export const useSuspendExecutiveMutation = () =>
  useMutation((args: { executiveId: string }) => api.organisation.suspendExecutive(args));

export const useReactivateExecutiveMutation = () =>
  useMutation((args: { executiveId: string }) => api.organisation.reactivateExecutive(args));

export const useUploadOrganisationLogoMutation = () =>
  useMutation((form: FormData) => api.organisation.uploadOrganisationLogo(form));

export const useRemoveOrganisationLogoMutation = () =>
  useMutation(() => api.organisation.removeOrganisationLogo());
