import { useMutation } from '@/hooks/use_mutation';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import type { ListUnitsParams } from '@/features/organisation';

import type { ListMembersParams, MemberImportResponse, MemberResponse } from '../types';

interface ReadOptions {
  enabled?: boolean;
}

export const useReadMembersQuery = (params: ListMembersParams, { enabled }: ReadOptions = {}) =>
  useQuery(['members', 'list', params], (options) => api.members.readMembers(params, options), {
    enabled,
  });

export const useReadMemberQuery = (memberId: string) =>
  useQuery(
    ['members', 'detail', memberId],
    (options) => api.members.readMember({ memberId }, options),
    { enabled: Boolean(memberId) },
  );

export const useCreateMemberMutation = () => useMutation(api.members.createMember);

export const useUpdateMemberMutation = () => useMutation(api.members.updateMember);

export const useDeactivateMemberMutation = () => useMutation(api.members.deactivateMember);

export const useReactivateMemberMutation = () => useMutation(api.members.reactivateMember);

// The members tab list: every page loaded so far for one search.
export const useMemberPages = (search: string) =>
  usePages<MemberResponse>(`members:${search}`, (page, options) =>
    api.members.readMembers({ page, pageSize: PAGE_SIZE, search: search || undefined }, options),
  );

export const useImportPages = () =>
  usePages<MemberImportResponse>('member-imports', (page, options) =>
    api.memberImports.readImports({ page, pageSize: PAGE_SIZE }, options),
  );

// Units for the unit picker. Read through `api` rather than the organisation hooks, which import
// this feature, so the two features don't load each other in a cycle.
export const useReadUnitChoicesQuery = (params: ListUnitsParams) =>
  useQuery(['organisation', 'units', params], (options) =>
    api.organisation.readUnits(params, options),
  );
