import type { ExecutiveRow } from './chairman_repository';
import type { ExecutiveResponse } from './chairman_types';

// Nested appointments arrive through json_agg, so their timestamps are strings; normalise to Date.
export function toExecutiveResponse(row: ExecutiveRow): ExecutiveResponse {
  return {
    id: row.id,
    memberId: row.memberId,
    memberNumber: row.memberNumber,
    fullName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    email: row.email,
    phone: row.phone,
    status: row.status,
    appointments: row.appointments.map((appointment) => ({
      ...appointment,
      effectiveFrom: new Date(appointment.effectiveFrom),
    })),
    lastSignInAt: row.lastSignInAt,
    createdAt: row.createdAt,
  };
}
