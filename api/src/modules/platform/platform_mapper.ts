import type { ConstituencyRow, ExecutiveRow } from './platform_repository';
import type {
  ChairmanResponse,
  ConstituencyResponse,
  ExecutiveSummaryResponse,
} from './platform_types';

// Nested rows arrive through to_jsonb, so their timestamps are strings; normalise to Date.
const toDate = (value: Date | string) => new Date(value);
const toDateOrNull = (value: Date | string | null) => (value === null ? null : toDate(value));

export function toExecutiveSummary(row: ExecutiveRow): ExecutiveSummaryResponse {
  return {
    id: row.id,
    memberId: row.memberId,
    fullName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    lastSignInAt: toDateOrNull(row.lastSignInAt),
    createdAt: toDate(row.createdAt),
  };
}

export function toConstituencyResponse(row: ConstituencyRow): ConstituencyResponse {
  const chairman: ChairmanResponse | null = row.chairman && {
    ...toExecutiveSummary(row.chairman),
    appointmentId: row.chairman.appointmentId,
    appointedAt: toDate(row.chairman.appointedAt),
  };

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    chairman,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
