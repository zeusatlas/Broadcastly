import type { EntityManager } from 'typeorm';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app_error';
import { toPaginated, type Paginated } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService } from '../audit';
import {
  actorFrom,
  auditActor,
  authService,
  type AccessContext,
  type ManageableStatus,
} from '../auth';
import { CHAIRMAN_POSITION_ID, organisationService } from '../organisation';

import { toExecutiveResponse } from './chairman_mapper';
import { chairmanRepository, type ManagedExecutive, type Scope } from './chairman_repository';
import type {
  AppointmentRequest,
  CreateOrganisationExecutiveRequest,
  CreatePositionRequest,
  CreateUnitRequest,
  ExecutiveResponse,
  ListExecutivesRequest,
  ListUnitsRequest,
  OrganisationOverviewResponse,
  PositionResponse,
  UnitResponse,
  UpdatePositionRequest,
} from './chairman_types';

const ORGANISATION_WIDE = 'organisation';
const OUT_OF_REACH = 'That is outside the units you manage.';
const EXECUTIVE_NOT_FOUND = 'Executive not found.';

// The caller's organisation; routes only let organisation executives in, so it is always set.
const organisationOf = (auth: AccessContext) => auth.organisationId!;
const scopeOf = (auth: AccessContext): Scope => (auth.organisationWide ? null : auth.scopeUnitIds);
const reaches = (auth: AccessContext, unitId: string | null) =>
  unitId === null
    ? auth.organisationWide
    : auth.organisationWide || auth.scopeUnitIds.includes(unitId);

function assertCanManage(auth: AccessContext, target: ManagedExecutive) {
  if (target.id === auth.accountId) throw new ForbiddenError('You cannot change your own account.');
  if (target.holdsChairman) {
    throw new ForbiddenError('Only a platform admin can change the chairman.');
  }
  const withinReach =
    auth.organisationWide ||
    (target.activeUnitIds.length > 0 &&
      target.activeUnitIds.every((unitId) => reaches(auth, unitId)));
  if (!withinReach) throw new ForbiddenError(OUT_OF_REACH);
}

// Checks one appointment request: a usable position, a unit that fits it and that the caller
// reaches, and no permission the caller does not hold.
async function checkAppointment(
  auth: AccessContext,
  { positionId, unitId = undefined, permissions }: AppointmentRequest,
  manager: EntityManager,
) {
  const organisationId = organisationOf(auth);
  const position = await organisationService.findPosition(organisationId, positionId, manager);
  if (!position || !position.isActive) throw new NotFoundError('Position not found.');
  if (position.id === CHAIRMAN_POSITION_ID) {
    throw new ForbiddenError('Only a platform admin can appoint a chairman.');
  }

  if (position.unitType === ORGANISATION_WIDE) {
    if (unitId) {
      throw new ValidationError({
        unitId: ['This position is organisation-wide; leave out the unit.'],
      });
    }
  } else {
    if (!unitId)
      throw new ValidationError({ unitId: [`Choose a ${position.unitType} for this position.`] });
    const unit = await organisationService.findUnit(organisationId, unitId, manager);
    if (!unit) throw new NotFoundError('Unit not found.');
    if (unit.type !== position.unitType) {
      throw new ValidationError({ unitId: [`This position needs a ${position.unitType}.`] });
    }
  }
  if (!reaches(auth, unitId ?? null)) throw new ForbiddenError(OUT_OF_REACH);

  const notHeld = permissions.filter((permission) => !auth.permissions.has(permission));
  if (notHeld.length > 0) {
    throw new ForbiddenError(`You can only grant permissions you hold: ${notHeld.join(', ')}.`);
  }
  return { organisationId, positionId: position.id, unitId: unitId ?? null };
}

async function appoint(
  auth: AccessContext,
  memberId: string,
  executiveId: string,
  request: AppointmentRequest,
  context: RequestContext,
  manager: EntityManager,
) {
  const checked = await checkAppointment(auth, request, manager);
  if (
    await chairmanRepository.holdsAppointment(memberId, checked.positionId, checked.unitId, manager)
  ) {
    throw new ConflictError('They already hold this position here.');
  }

  const appointment = await organisationService.createAppointment(
    { ...checked, memberId, appointedByExecutiveId: auth.accountId },
    manager,
  );
  await organisationService.grantPermissions(
    appointment.id,
    request.permissions,
    auth.accountId,
    manager,
  );
  await auditService.record(
    {
      action: AUDIT_ACTIONS.appointmentCreated,
      targetType: 'appointment',
      targetId: appointment.id,
      metadata: { ...checked, executiveId, permissions: request.permissions },
      ...auditActor(actorFrom(auth, context)),
    },
    manager,
  );
}

// The chairman's (or a granted manager's) tools for their own organisation.
export const chairmanService = {
  getOverview(auth: AccessContext): Promise<OrganisationOverviewResponse> {
    return chairmanRepository.getOverview(organisationOf(auth), scopeOf(auth));
  },

  listPositions(auth: AccessContext): Promise<PositionResponse[]> {
    return chairmanRepository.listPositions(organisationOf(auth));
  },

  async createPosition(auth: AccessContext, input: CreatePositionRequest, context: RequestContext) {
    const organisationId = organisationOf(auth);
    const { id } = await dataSource.transaction(async (manager) => {
      if (await organisationService.positionTitleExists(organisationId, input.title, manager)) {
        throw new ConflictError('A position with this title already exists.', {
          errors: { title: ['A position with this title already exists.'] },
        });
      }
      const position = await organisationService.createPosition(
        { organisationId, ...input },
        manager,
      );
      await auditService.record(
        {
          action: AUDIT_ACTIONS.positionCreated,
          targetType: 'position',
          targetId: position.id,
          metadata: { unitType: input.unitType },
          ...auditActor(actorFrom(auth, context)),
        },
        manager,
      );
      return position;
    });
    return (await chairmanRepository.findPosition(organisationId, id))!;
  },

  async updatePosition(
    auth: AccessContext,
    positionId: string,
    changes: UpdatePositionRequest,
    context: RequestContext,
  ) {
    const organisationId = organisationOf(auth);
    await dataSource.transaction(async (manager) => {
      const position = await organisationService.findPosition(organisationId, positionId, manager);
      if (!position) throw new NotFoundError('Position not found.');
      if (position.organisationId === null) {
        throw new ForbiddenError('Built-in positions cannot be changed.');
      }
      if (
        changes.title &&
        (await organisationService.positionTitleExists(
          organisationId,
          changes.title,
          manager,
          positionId,
        ))
      ) {
        throw new ConflictError('A position with this title already exists.');
      }
      await organisationService.updatePosition(positionId, changes, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.positionUpdated,
          targetType: 'position',
          targetId: positionId,
          metadata: { changes: Object.keys(changes) },
          ...auditActor(actorFrom(auth, context)),
        },
        manager,
      );
    });
    return (await chairmanRepository.findPosition(organisationId, positionId))!;
  },

  async listUnits(
    auth: AccessContext,
    { page, pageSize, ...filters }: ListUnitsRequest,
  ): Promise<Paginated<UnitResponse>> {
    const { rows, total } = await chairmanRepository.listUnits(
      organisationOf(auth),
      scopeOf(auth),
      filters,
      { page, pageSize },
    );
    return toPaginated(rows, total, { page, pageSize });
  },

  async createUnit(auth: AccessContext, input: CreateUnitRequest, context: RequestContext) {
    const organisationId = organisationOf(auth);
    const parentId = input.parentId ?? null;
    const { id } = await dataSource.transaction(async (manager) => {
      if (parentId && !(await organisationService.findUnit(organisationId, parentId, manager))) {
        throw new NotFoundError('Parent unit not found.');
      }
      if (await organisationService.unitNameExists(organisationId, parentId, input.name, manager)) {
        throw new ConflictError('A unit with this name already exists here.', {
          errors: { name: ['A unit with this name already exists here.'] },
        });
      }
      const unit = await organisationService.createUnit(
        { organisationId, parentId, type: input.type, name: input.name },
        manager,
      );
      await auditService.record(
        {
          action: AUDIT_ACTIONS.unitCreated,
          targetType: 'organisation_unit',
          targetId: unit.id,
          metadata: { type: input.type, parentId },
          ...auditActor(actorFrom(auth, context)),
        },
        manager,
      );
      return unit;
    });
    return (await chairmanRepository.findUnit(organisationId, id))!;
  },

  async listExecutives(
    auth: AccessContext,
    { page, pageSize, ...filters }: ListExecutivesRequest,
  ): Promise<Paginated<ExecutiveResponse>> {
    const { rows, total } = await chairmanRepository.listExecutives(
      organisationOf(auth),
      scopeOf(auth),
      filters,
      { page, pageSize },
    );
    return toPaginated(rows.map(toExecutiveResponse), total, { page, pageSize });
  },

  async getExecutive(auth: AccessContext, executiveId: string): Promise<ExecutiveResponse> {
    const row = await chairmanRepository.findExecutive(
      organisationOf(auth),
      scopeOf(auth),
      executiveId,
    );
    if (!row) throw new NotFoundError(EXECUTIVE_NOT_FOUND);
    return toExecutiveResponse(row);
  },

  // Promotes a member of this organisation (found by party ID, or created) and appoints them.
  async createExecutive(
    auth: AccessContext,
    { positionId, unitId, permissions, ...details }: CreateOrganisationExecutiveRequest,
    context: RequestContext,
  ) {
    const organisationId = organisationOf(auth);
    const executiveId = await dataSource.transaction(async (manager) => {
      await checkAppointment(auth, { positionId, unitId, permissions }, manager);
      const created = await authService.createExecutive(
        { ...details, organisationId },
        actorFrom(auth, context),
        manager,
      );
      await appoint(
        auth,
        created.memberId,
        created.executiveId,
        { positionId, unitId, permissions },
        context,
        manager,
      );
      return created.executiveId;
    });
    return chairmanService.getExecutive(auth, executiveId);
  },

  async addAppointment(
    auth: AccessContext,
    executiveId: string,
    request: AppointmentRequest,
    context: RequestContext,
  ) {
    await dataSource.transaction(async (manager) => {
      const target = await chairmanRepository.findManagedExecutive(
        organisationOf(auth),
        executiveId,
        manager,
      );
      if (!target) throw new NotFoundError(EXECUTIVE_NOT_FOUND);
      assertCanManage(auth, target);
      await appoint(auth, target.memberId, target.id, request, context, manager);
    });
    return chairmanService.getExecutive(auth, executiveId);
  },

  async endAppointment(
    auth: AccessContext,
    appointmentId: string,
    reason: string | undefined,
    context: RequestContext,
  ) {
    await dataSource.transaction(async (manager) => {
      const appointment = await organisationService.lockAppointment(
        organisationOf(auth),
        appointmentId,
        manager,
      );
      if (!appointment) throw new NotFoundError('Appointment not found.');
      if (appointment.status !== 'active')
        throw new ConflictError('This appointment has already ended.');
      if (appointment.positionId === CHAIRMAN_POSITION_ID) {
        throw new ForbiddenError('Only a platform admin can change the chairman.');
      }
      if (appointment.memberId === auth.memberId) {
        throw new ForbiddenError('You cannot end your own appointment.');
      }
      if (!reaches(auth, appointment.unitId)) throw new ForbiddenError(OUT_OF_REACH);

      await organisationService.endAppointment(
        appointmentId,
        auth.accountId,
        reason ?? null,
        manager,
      );
      await auditService.record(
        {
          action: AUDIT_ACTIONS.appointmentEnded,
          targetType: 'appointment',
          targetId: appointmentId,
          metadata: { positionId: appointment.positionId, unitId: appointment.unitId },
          ...auditActor(actorFrom(auth, context)),
        },
        manager,
      );
    });
  },

  async setExecutiveStatus(
    auth: AccessContext,
    executiveId: string,
    status: ManageableStatus,
    context: RequestContext,
  ) {
    const target = await chairmanRepository.findManagedExecutive(organisationOf(auth), executiveId);
    if (!target) throw new NotFoundError(EXECUTIVE_NOT_FOUND);
    assertCanManage(auth, target);
    await authService.setExecutiveStatus(executiveId, status, actorFrom(auth, context));
    return chairmanService.getExecutive(auth, executiveId);
  },
};
