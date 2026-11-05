import { http, type RequestOptions } from '@/lib/api';

import type {
  CreateMemberRequest,
  ListMembersParams,
  MemberResponse,
  MembersResponse,
  UpdateMemberRequest,
} from '../types';

export const membersEndpoints = {
  readMembers: (params: ListMembersParams, options?: RequestOptions) =>
    http.get<MembersResponse>('/members', { ...options, params }),

  readMember: ({ memberId }: { memberId: string }, options?: RequestOptions) =>
    http.get<MemberResponse>(`/members/${memberId}`, options),

  createMember: (credentials: CreateMemberRequest) =>
    http.post<MemberResponse, CreateMemberRequest>('/members', credentials),

  updateMember: ({
    memberId,
    credentials,
  }: {
    memberId: string;
    credentials: UpdateMemberRequest;
  }) => http.patch<MemberResponse, UpdateMemberRequest>(`/members/${memberId}`, credentials),

  deactivateMember: ({ memberId }: { memberId: string }) =>
    http.post<MemberResponse>(`/members/${memberId}/deactivate`),

  reactivateMember: ({ memberId }: { memberId: string }) =>
    http.post<MemberResponse>(`/members/${memberId}/reactivate`),
};
