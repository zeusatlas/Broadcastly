import { publicUploadUrl } from '../../common/uploads/image_upload';
import type { PlatformAdminResponse } from '../auth';

import type { ExecutiveRow, OrganisationRow, PlatformAdminRow } from './platform_repository';
import type {
  ChairmanResponse,
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
  const chairman: ChairmanResponse | null = row.chairman && {
    ...executiveBase(row.chairman),
    appointmentId: row.chairman.appointmentId,
    appointedAt: toDate(row.chairman.appointedAt),
  };

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    logoUrl: publicUploadUrl(row.logoPath),
    credits: {
      balance: row.creditBalance,
      reserved: row.creditReserved,
      available: row.creditBalance - row.creditReserved,
    },
    chairman,
    memberCount: row.memberCount,
    executiveCount: row.executiveCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPlatformAdminSummary(row: PlatformAdminRow): PlatformAdminResponse {
  return { ...row, fullName: `${row.firstName} ${row.lastName}` };
}
