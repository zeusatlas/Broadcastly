import type { ProfileAccess } from './access_resolver';
import type { UserResponse } from './auth_types';
import type { Executive } from './entities/executive_entity';

// Entities never leave the service layer; this is the only shape of an executive the API returns.
export function toUserResponse(executive: Executive, access: ProfileAccess): UserResponse {
  const member = executive.member!;
  const fullName = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ');

  return {
    id: executive.id,
    memberId: member.id,
    partyId: member.partyId,
    firstName: member.firstName,
    middleName: member.middleName,
    lastName: member.lastName,
    fullName,
    email: executive.email,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth,
    role: executive.role,
    status: executive.status,
    permissions: access.permissions,
    appointments: access.appointments,
    lastSignInAt: executive.lastSignInAt,
    createdAt: executive.createdAt,
    updatedAt: executive.updatedAt,
  };
}
