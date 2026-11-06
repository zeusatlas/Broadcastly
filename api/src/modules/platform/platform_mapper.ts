import { publicUploadUrl } from '../../common/uploads/image_upload';
import { platformPermissionsOf, type PlatformAdminResponse } from '../auth';

import type { ExecutiveRow, OrganisationRow, PlatformAdminRow } from './platform_repository';
import type {
  HeadResponse,
  OrganisationExecutiveResponse,
  OrganisationResponse,
} from './platform_types';

// Nested rows arrive through to_jsonb, so their timestamps are strings; normalise to Date.
const toDate = (value: Date | string) => new Date(value);

function executiveBase(row: ExecutiveRow) {
  return {
    id: row.id,
    memberId: row.memberId,
    partyId: row.partyId,
    fullName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    email: row.email,
    phone: row.phone,
    status: row.status,
    lastSignInAt: row.lastSignInAt === null ? null : toDate(row.lastSignInAt),
    createdAt: toDate(row.createdAt),
  };
}

export function toOrganisationExecutive(row: ExecutiveRow): OrganisationExecutiveResponse {
  return {
    ...executiveBase(row),
    positions: row.positions ?? [],
    creditBalance: row.creditBalance,
  };
}

export function toOrganisationResponse(row: OrganisationRow): OrganisationResponse {
  const head: HeadResponse | null = row.head && {
    ...executiveBase(row.head),
    appointmentId: row.head.appointmentId,
    appointedAt: toDate(row.head.appointedAt),
  };

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    headTitle: row.headTitle,
    description: row.description,
    status: row.status,
    logoUrl: publicUploadUrl(row.logoPath),
    credits: {
      balance: row.creditBalance,
      reserved: row.creditReserved,
      available: row.creditBalance - row.creditReserved,
    },
    head,
    memberCount: row.memberCount,
    executiveCount: row.executiveCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPlatformAdminSummary(row: PlatformAdminRow): PlatformAdminResponse {
  return {
    ...row,
    fullName: `${row.firstName} ${row.lastName}`,
    permissions: platformPermissionsOf(row),
  };
}
