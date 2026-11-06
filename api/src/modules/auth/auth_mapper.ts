import { publicUploadUrl } from '../../common/uploads/image_upload';

import type { ProfileAccess } from './access_resolver';
import type { PlatformAdminResponse, UserResponse } from './auth_types';
import type { OrganisationExecutive } from './entities/organisation_executive_entity';
import type { PlatformAdmin } from './entities/platform_admin_entity';
import { platformPermissionsOf } from './platform_permissions';

// Entities never leave the service layer; these are the only shapes of an account the API returns.
export function toUserResponse(
  executive: OrganisationExecutive,
  access: ProfileAccess,
): UserResponse {
  const member = executive.member!;
  const organisation = member.organisation!;

  return {
    id: executive.id,
    role: access.role,
    status: executive.status,
    firstName: member.firstName,
    middleName: member.middleName,
    lastName: member.lastName,
    fullName: [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' '),
    email: executive.email,
    phone: member.phone,
    memberId: member.id,
    partyId: member.partyId,
    dateOfBirth: member.dateOfBirth,
    organisation: {
      id: organisation.id,
      name: organisation.name,
      type: organisation.type,
      logoUrl: publicUploadUrl(organisation.logoPath),
    },
    permissions: access.permissions,
    appointments: access.appointments,
    lastSignInAt: executive.lastSignInAt,
    createdAt: executive.createdAt,
    updatedAt: executive.updatedAt,
  };
}

export function toAdminUserResponse(admin: PlatformAdmin): UserResponse {
  return {
    id: admin.id,
    role: 'platform_admin',
    status: admin.status,
    firstName: admin.firstName,
    middleName: null,
    lastName: admin.lastName,
    fullName: `${admin.firstName} ${admin.lastName}`,
    email: admin.email,
    phone: admin.phone,
    memberId: null,
    partyId: null,
    dateOfBirth: null,
    organisation: null,
    permissions: platformPermissionsOf(admin),
    appointments: [],
    lastSignInAt: admin.lastSignInAt,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

export function toPlatformAdminResponse(admin: PlatformAdmin): PlatformAdminResponse {
  return {
    id: admin.id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    fullName: `${admin.firstName} ${admin.lastName}`,
    email: admin.email,
    phone: admin.phone,
    status: admin.status,
    isSuperAdmin: admin.isSuperAdmin,
    permissions: platformPermissionsOf(admin),
    lastSignInAt: admin.lastSignInAt,
    createdAt: admin.createdAt,
  };
}
