import type { EntityManager } from 'typeorm';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app_error';
import type { Paginated } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService, type AuditAction } from '../audit';
import { actorFrom, auditActor, type AccessContext } from '../auth';

import { Member } from './entities/member_entity';
import { Membership } from './entities/membership_entity';
import { membersRepository, type MemberScope } from './members_repository';
import type {
  CreateMemberRequest,
  ListMembersRequest,
  MemberResponse,
  UpdateMemberRequest,
} from './members_types';

const PARTY_ID_TAKEN = 'A member with this party ID already exists.';
const NOT_FOUND = 'Member not found.';

export const organisationOf = (auth: AccessContext) => {
  if (!auth.organisationId)
    throw new ForbiddenError('Only executives of an organisation can do this.');
  return auth.organisationId;
};
export const scopeOf = (auth: AccessContext): MemberScope =>
  auth.organisationWide ? null : auth.scopeUnitIds;

export async function audit(
  auth: AccessContext,
  context: RequestContext,
  action: AuditAction,
  targetType: string,
  targetId: string,
  manager: EntityManager,
  metadata: Record<string, unknown> = {},
) {
  await auditService.record(
    { action, targetType, targetId, metadata, ...auditActor(actorFrom(auth, context)) },
    manager,
  );
}

// Unit-scoped executives must place a member inside their reach; organisation-wide ones may leave it open.
async function checkUnit(auth: AccessContext, unitId: string | undefined, manager: EntityManager) {
  if (!unitId) {
    if (!auth.organisationWide)
      throw new ValidationError({ unitId: ['Choose the unit this member belongs to.'] });
    return;
  }
  if (!(await membersRepository.unitInOrganisation(organisationOf(auth), unitId, manager))) {
    throw new ValidationError({ unitId: ['Choose an active unit in your organisation.'] });
  }
  if (!auth.organisationWide && !auth.scopeUnitIds.includes(unitId)) {
    throw new ForbiddenError('That unit is outside your assigned scope.');
  }
}

async function placeInUnit(
  auth: AccessContext,
  memberId: string,
  unitId: string,
  manager: EntityManager,
) {
  await manager
    .getRepository(Membership)
    .update({ memberId, status: 'active' }, { status: 'ended', endedAt: new Date() });
  await manager.getRepository(Membership).insert({
    organisationId: organisationOf(auth),
    memberId,
    unitId,
    source: 'manual',
    createdByExecutiveId: auth.kind === 'executive' ? auth.accountId : null,
  });
}

async function setStatus(
  auth: AccessContext,
  memberId: string,
  status: 'active' | 'inactive',
  context: RequestContext,
): Promise<MemberResponse> {
  const organisationId = organisationOf(auth);
  return dataSource.transaction(async (manager) => {
    const member = await membersRepository.lockMember(
      organisationId,
      scopeOf(auth),
      memberId,
      manager,
    );
    if (!member) throw new NotFoundError(NOT_FOUND);
    if (member.status !== status) {
      if (
        status === 'inactive' &&
        (await membersRepository.hasActiveExecutive(memberId, manager))
      ) {
        throw new ConflictError(
          'This member is an executive. End their appointments before deactivating them.',
        );
      }
      await manager
        .getRepository(Member)
        .update(
          { id: memberId },
          { status, deactivatedAt: status === 'inactive' ? new Date() : null },
        );
      const action =
        status === 'inactive' ? AUDIT_ACTIONS.memberDeactivated : AUDIT_ACTIONS.memberReactivated;
      await audit(auth, context, action, 'member', memberId, manager);
    }
    return (await membersRepository.findById(organisationId, null, memberId, manager))!;
  });
}

export const membersService = {
  list(auth: AccessContext, request: ListMembersRequest): Promise<Paginated<MemberResponse>> {
    return membersRepository.list(organisationOf(auth), scopeOf(auth), request);
  },

  async get(auth: AccessContext, id: string): Promise<MemberResponse> {
    const member = await membersRepository.findById(organisationOf(auth), scopeOf(auth), id);
    if (!member) throw new NotFoundError(NOT_FOUND);
    return member;
  },

  async create(
    auth: AccessContext,
    request: CreateMemberRequest,
    context: RequestContext,
  ): Promise<MemberResponse> {
    const organisationId = organisationOf(auth);
    return dataSource.transaction(async (manager) => {
      await checkUnit(auth, request.unitId, manager);
      if (
        request.partyId &&
        (await membersRepository.partyIdTaken(organisationId, request.partyId, null, manager))
      ) {
        throw new ConflictError(PARTY_ID_TAKEN);
      }
      const { identifiers } = await manager.getRepository(Member).insert({
        organisationId,
        firstName: request.firstName,
        middleName: request.middleName || null,
        lastName: request.lastName,
        partyId: request.partyId ?? null,
        phone: request.phone ?? null,
        dateOfBirth: request.dateOfBirth ?? null,
      });
      const memberId = identifiers[0]!.id as string;
      if (request.unitId) await placeInUnit(auth, memberId, request.unitId, manager);
      await audit(auth, context, AUDIT_ACTIONS.memberCreated, 'member', memberId, manager);
      return (await membersRepository.findById(organisationId, null, memberId, manager))!;
    });
  },

  async update(
    auth: AccessContext,
    memberId: string,
    request: UpdateMemberRequest,
    context: RequestContext,
  ): Promise<MemberResponse> {
    const organisationId = organisationOf(auth);
    return dataSource.transaction(async (manager) => {
      const member = await membersRepository.lockMember(
        organisationId,
        scopeOf(auth),
        memberId,
        manager,
      );
      if (!member) throw new NotFoundError(NOT_FOUND);
      if (
        request.partyId &&
        request.partyId !== member.partyId &&
        (await membersRepository.partyIdTaken(organisationId, request.partyId, memberId, manager))
      ) {
        throw new ConflictError(PARTY_ID_TAKEN);
      }

      const { unitId, ...fields } = request;
      const changes = Object.fromEntries(
        Object.entries(fields)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, value === '' ? null : value]),
      );
      if (Object.keys(changes).length > 0)
        await manager.getRepository(Member).update({ id: memberId }, changes);
      if (unitId && unitId !== member.unitId) {
        await checkUnit(auth, unitId, manager);
        await placeInUnit(auth, memberId, unitId, manager);
      }

      // Field names only: values are personal data and stay out of the audit log.
      const changed = [
        ...Object.keys(changes),
        ...(unitId && unitId !== member.unitId ? ['unitId'] : []),
      ];
      await audit(auth, context, AUDIT_ACTIONS.memberUpdated, 'member', memberId, manager, {
        changed,
      });
      return (await membersRepository.findById(organisationId, null, memberId, manager))!;
    });
  },

  deactivate(auth: AccessContext, memberId: string, context: RequestContext) {
    return setStatus(auth, memberId, 'inactive', context);
  },

  reactivate(auth: AccessContext, memberId: string, context: RequestContext) {
    return setStatus(auth, memberId, 'active', context);
  },
};
