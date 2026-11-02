import { ConflictError, NotFoundError } from '../../common/errors/app_error';
import { toPaginated, type PageParams, type Paginated } from '../../common/http/pagination';
import { toAuditContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService } from '../audit';
import { authService, type ActionActor, type UserRole } from '../auth';
import {
  CONSTITUENCY_CHAIRMAN_POSITION_ID,
  CONSTITUENCY_UNIT_TYPE,
  organisationService,
} from '../organisation';

import { toConstituencyResponse, toExecutiveSummary } from './platform_mapper';
import { platformRepository } from './platform_repository';
import type {
  ConstituencyResponse,
  CreateConstituencyRequest,
  ExecutiveSummaryResponse,
  ListConstituenciesRequest,
  NewExecutiveRequest,
  PlatformOverviewResponse,
} from './platform_types';

// Accounts a platform admin manages. Everyone else is managed by their chairman (UC-02).
const PLATFORM_MANAGED_ROLES: readonly UserRole[] = ['platform_admin', 'constituency_chairman'];

const CONSTITUENCY_NOT_FOUND = 'Constituency not found.';
const NAME_TAKEN = 'A constituency with this name already exists.';

const auditFields = (actor: ActionActor) => ({
  actorExecutiveId: actor.executiveId,
  ...(actor.context && toAuditContext(actor.context)),
});

export const platformService = {
  getOverview(): Promise<PlatformOverviewResponse> {
    return platformRepository.getOverview();
  },

  async listConstituencies({
    search,
    ...page
  }: ListConstituenciesRequest): Promise<Paginated<ConstituencyResponse>> {
    const { rows, total } = await platformRepository.listConstituencies(search, page);
    return toPaginated(rows.map(toConstituencyResponse), total, page);
  },

  async getConstituency(constituencyId: string): Promise<ConstituencyResponse> {
    const row = await platformRepository.findConstituency(constituencyId);
    if (!row) throw new NotFoundError(CONSTITUENCY_NOT_FOUND);
    return toConstituencyResponse(row);
  },

  async createConstituency(
    { name }: CreateConstituencyRequest,
    actor: ActionActor,
  ): Promise<ConstituencyResponse> {
    const { id } = await dataSource.transaction(async (manager) => {
      // Friendly check first; the unique index still catches a race (mapped to 409).
      if (await organisationService.constituencyNameExists(name, manager)) {
        throw new ConflictError(NAME_TAKEN, { errors: { name: [NAME_TAKEN] } });
      }

      const unit = await organisationService.createConstituency(name, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.constituencyCreated,
          targetType: 'organisational_unit',
          targetId: unit.id,
          ...auditFields(actor),
        },
        manager,
      );
      return unit;
    });

    return platformService.getConstituency(id);
  },

  // Creates the chairman's account and appointment together: both exist, or neither does.
  async appointChairman(
    constituencyId: string,
    details: NewExecutiveRequest,
    actor: ActionActor,
  ): Promise<ConstituencyResponse> {
    await dataSource.transaction(async (manager) => {
      const unit = await organisationService.lockUnit(constituencyId, manager);
      if (!unit || unit.type !== CONSTITUENCY_UNIT_TYPE) {
        throw new NotFoundError(CONSTITUENCY_NOT_FOUND);
      }
      if (unit.status !== 'active') {
        throw new ConflictError('This constituency is inactive.');
      }
      if (await organisationService.hasActiveChairman(constituencyId, manager)) {
        throw new ConflictError('This constituency already has a chairman.');
      }

      const { executiveId, memberId } = await authService.createExecutive(
        { ...details, role: 'constituency_chairman' },
        actor,
        manager,
      );
      const appointment = await organisationService.createAppointment(
        {
          memberId,
          positionId: CONSTITUENCY_CHAIRMAN_POSITION_ID,
          unitId: constituencyId,
          appointedByExecutiveId: actor.executiveId,
        },
        manager,
      );

      await auditService.record(
        {
          action: AUDIT_ACTIONS.appointmentCreated,
          targetType: 'appointment',
          targetId: appointment.id,
          metadata: {
            unitId: constituencyId,
            positionId: CONSTITUENCY_CHAIRMAN_POSITION_ID,
            executiveId,
          },
          ...auditFields(actor),
        },
        manager,
      );
    });

    return platformService.getConstituency(constituencyId);
  },

  async listPlatformAdmins(page: PageParams): Promise<Paginated<ExecutiveSummaryResponse>> {
    const { rows, total } = await platformRepository.listExecutivesByRole('platform_admin', page);
    return toPaginated(rows.map(toExecutiveSummary), total, page);
  },

  async createPlatformAdmin(
    details: NewExecutiveRequest,
    actor: ActionActor,
  ): Promise<ExecutiveSummaryResponse> {
    const { executiveId } = await authService.createExecutive(
      { ...details, role: 'platform_admin' },
      actor,
    );
    return platformService.getExecutive(executiveId);
  },

  async suspendExecutive(executiveId: string, actor: ActionActor) {
    await authService.setExecutiveStatus(executiveId, 'suspended', actor, PLATFORM_MANAGED_ROLES);
    return platformService.getExecutive(executiveId);
  },

  async reactivateExecutive(executiveId: string, actor: ActionActor) {
    await authService.setExecutiveStatus(executiveId, 'active', actor, PLATFORM_MANAGED_ROLES);
    return platformService.getExecutive(executiveId);
  },

  async getExecutive(executiveId: string): Promise<ExecutiveSummaryResponse> {
    const row = await platformRepository.findExecutive(executiveId);
    if (!row || !PLATFORM_MANAGED_ROLES.includes(row.role)) {
      throw new NotFoundError('Account not found.');
    }
    return toExecutiveSummary(row);
  },
};
