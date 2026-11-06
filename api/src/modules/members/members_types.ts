import type { PageParams } from '../../common/http/pagination';

export const MEMBER_STATUSES = ['active', 'inactive'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_SORTS = ['first_name', 'last_name'] as const;
export type MemberSort = (typeof MEMBER_SORTS)[number];

export const MEMBERSHIP_SOURCES = ['manual', 'import'] as const;
export type MembershipSource = (typeof MEMBERSHIP_SOURCES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'ended'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface ListMembersRequest extends PageParams {
  search?: string;
  status?: MemberStatus;
  unitId?: string;
  isExecutive?: boolean;
  sort?: MemberSort;
  // unit: rows come unit by unit (no unit last), so the app can show one section per unit.
  groupBy?: 'unit';
}

export interface CreateMemberRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  memberNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  unitId?: string;
}

// null clears an optional field; an omitted field is left as it is.
export interface UpdateMemberRequest {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  memberNumber?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  unitId?: string;
}

export interface MemberParams {
  memberId: string;
}

export interface MemberResponse {
  id: string;
  organisationId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  memberNumber: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  unitId: string | null;
  unitName: string | null;
  status: MemberStatus;
  isExecutive: boolean;
  createdAt: Date;
}
