import { ConflictError, NotFoundError } from '../../common/errors/app_error';
import { toPaginated, type Paginated } from '../../common/http/pagination';
import { resolvePeriod, type PeriodParams } from '../../common/http/period';
import { removeUpload } from '../../common/uploads/image_upload';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService } from '../audit';
import {
  auditActor,
  authService,
  type ActionActor,
  type CreatePlatformAdminRequest,
  type ManageableStatus,
  type PlatformAdminResponse,
} from '../auth';
import type { BroadcastResponse } from '../broadcasts';
import { creditsService, type CreditTransactionResponse, type PurchaseResponse } from '../credits';
import { CHAIRMAN_POSITION_ID, organisationService } from '../organisation';

import {
  toOrganisationExecutive,
  toOrganisationResponse,
  toPlatformAdminSummary,
} from './platform_mapper';
import { platformRepository } from './platform_repository';
import type {
  AppointChairmanRequest,
  CreateOrganisationRequest,
  ListBroadcastsRequest,
  ListOrganisationCreditTransactionsRequest,
  ListPlatformPurchasesRequest,
  PurchaseSummaryResponse,
  ListOrganisationExecutivesRequest,
  ListOrganisationsRequest,
  ListPlatformAdminsRequest,
  OrganisationExecutiveResponse,
  OrganisationResponse,
  PlatformOverviewResponse,
} from './platform_types';

const ORGANISATION_NOT_FOUND = 'Organisation not found.';
const EXECUTIVE_NOT_FOUND = 'Executive not found in this organisation.';
const NAME_TAKEN = 'An organisation with this name already exists.';

// The platform admin is the super admin: every organisation, its executives, and every admin.
export const platformService = {
  async getOverview(): Promise<PlatformOverviewResponse> {
    const [counts, purchases] = await Promise.all([
      platformRepository.getOverview(),
      creditsService.purchaseTotals({ period: 'all_time' }),
    ]);
    return { ...counts, ...purchases };
  },

  purchaseSummary(period: PeriodParams): Promise<PurchaseSummaryResponse> {
    return creditsService.purchaseTotals(period);
  },

  async listOrganisations({
    page,
    pageSize,
    ...filters
  }: ListOrganisationsRequest): Promise<Paginated<OrganisationResponse>> {
    const { rows, total } = await platformRepository.listOrganisations(filters, { page, pageSize });
    return toPaginated(rows.map(toOrganisationResponse), total, { page, pageSize });
  },

  async getOrganisation(organisationId: string): Promise<OrganisationResponse> {
    const row = await platformRepository.findOrganisation(organisationId);
    if (!row) throw new NotFoundError(ORGANISATION_NOT_FOUND);
    return toOrganisationResponse(row);
  },

  async createOrganisation(
    input: CreateOrganisationRequest,
    actor: ActionActor,
  ): Promise<OrganisationResponse> {
    const { id } = await dataSource.transaction(async (manager) => {
      // Friendly check first; the unique index still catches a race (mapped to 409).
      if (await organisationService.organisationNameExists(input.name, manager)) {
        throw new ConflictError(NAME_TAKEN, { errors: { name: [NAME_TAKEN] } });
      }

      const organisation = await organisationService.createOrganisation(input, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.organisationCreated,
          targetType: 'organisation',
          targetId: organisation.id,
          metadata: { type: input.type },
          ...auditActor(actor),
        },
        manager,
      );
      return organisation;
    });

    return platformService.getOrganisation(id);
  },

  // The chairman is a member of this organisation promoted to executive; all rows commit together.
  async appointChairman(
    organisationId: string,
    details: AppointChairmanRequest,
    actor: ActionActor,
  ): Promise<OrganisationResponse> {
    await dataSource.transaction(async (manager) => {
      const organisation = await organisationService.lockOrganisation(organisationId, manager);
      if (!organisation) throw new NotFoundError(ORGANISATION_NOT_FOUND);
      if (organisation.status !== 'active') {
        throw new ConflictError('This organisation is inactive.');
      }
      if (await organisationService.hasActiveChairman(organisationId, manager)) {
         throw new ConflictError('This organisation already has a head.');
      }

      const { executiveId, memberId } = await authService.createExecutive(
        { ...details, organisationId },
        actor,
        manager,
      );
      const appointment = await organisationService.createAppointment(
        {
          memberId,
          positionId: CHAIRMAN_POSITION_ID,
          organisationId,
          unitId: null,
          appointedByExecutiveId: actor.executiveId ?? null,
        },
        manager,
      );

      await auditService.record(
        {
          action: AUDIT_ACTIONS.appointmentCreated,
          targetType: 'appointment',
          targetId: appointment.id,
          metadata: { organisationId, positionId: CHAIRMAN_POSITION_ID, executiveId },
          ...auditActor(actor),
        },
        manager,
      );
    });

    return platformService.getOrganisation(organisationId);
  },

  async listOrganisationExecutives(
    organisationId: string,
    { page, pageSize, ...filters }: ListOrganisationExecutivesRequest,
  ): Promise<Paginated<OrganisationExecutiveResponse>> {
    await platformService.getOrganisation(organisationId);
    const { rows, total } = await platformRepository.listOrganisationExecutives(
      organisationId,
      filters,
      { page, pageSize },
    );
    return toPaginated(rows.map(toOrganisationExecutive), total, { page, pageSize });
  },

  async getOrganisationExecutive(
    organisationId: string,
    executiveId: string,
  ): Promise<OrganisationExecutiveResponse> {
    const row = await platformRepository.findOrganisationExecutive(organisationId, executiveId);
    if (!row) throw new NotFoundError(EXECUTIVE_NOT_FOUND);
    return toOrganisationExecutive(row);
  },

  // Checked against the organisation first, so an id from another organisation is a 404.
  async setExecutiveStatus(
    organisationId: string,
    executiveId: string,
    status: ManageableStatus,
    actor: ActionActor,
  ): Promise<OrganisationExecutiveResponse> {
    await platformService.getOrganisationExecutive(organisationId, executiveId);
    await authService.setExecutiveStatus(executiveId, status, actor);
    return platformService.getOrganisationExecutive(organisationId, executiveId);
  },

  // Suspending ends every session of its executives at once; they cannot sign in until reactivated.
  async setOrganisationStatus(
    organisationId: string,
    status: 'active' | 'suspended',
    actor: ActionActor,
  ): Promise<OrganisationResponse> {
    await dataSource.transaction(async (manager) => {
      const organisation = await organisationService.lockOrganisation(organisationId, manager);
      if (!organisation) throw new NotFoundError(ORGANISATION_NOT_FOUND);
      if (organisation.status === status) return;
      if (organisation.status === 'inactive') {
        throw new ConflictError('This organisation is inactive.');
      }

      await organisationService.setOrganisationStatus(organisationId, status, manager);
      if (status === 'suspended')
        await authService.endOrganisationSessions(organisationId, manager);
      await auditService.record(
        {
          action:
            status === 'suspended'
              ? AUDIT_ACTIONS.organisationSuspended
              : AUDIT_ACTIONS.organisationReactivated,
          targetType: 'organisation',
          targetId: organisationId,
          metadata: { previousStatus: organisation.status },
          ...auditActor(actor),
        },
        manager,
      );
    });
    return platformService.getOrganisation(organisationId);
  },

  async setOrganisationLogo(
    organisationId: string,
    logoPath: string | null,
    actor: ActionActor,
  ): Promise<OrganisationResponse> {
    let previous: string | null = null;
    try {
      await dataSource.transaction(async (manager) => {
        const organisation = await organisationService.lockOrganisation(organisationId, manager);
        if (!organisation) throw new NotFoundError(ORGANISATION_NOT_FOUND);
        previous = organisation.logoPath;

        await organisationService.setOrganisationLogo(organisationId, logoPath, manager);
        await auditService.record(
          {
            action: logoPath
              ? AUDIT_ACTIONS.organisationLogoUpdated
              : AUDIT_ACTIONS.organisationLogoRemoved,
            targetType: 'organisation',
            targetId: organisationId,
            ...auditActor(actor),
          },
          manager,
        );
      });
    } catch (error) {
      if (logoPath) await removeUpload(logoPath);
      throw error;
    }
    if (previous && previous !== logoPath) await removeUpload(previous);
    return platformService.getOrganisation(organisationId);
  },

  async listBroadcasts({
    page,
    pageSize,
    organisationId,
    status,
    search,
    ...period
  }: ListBroadcastsRequest): Promise<Paginated<BroadcastResponse>> {
    if (organisationId) await platformService.getOrganisation(organisationId);
    const { rows, total } = await platformRepository.listBroadcasts(
      { organisationId, status, search, range: resolvePeriod(period) },
      { page, pageSize },
    );
    return toPaginated(rows, total, { page, pageSize });
  },

  async listPurchases({
    organisationId,
    ...query
  }: ListPlatformPurchasesRequest): Promise<Paginated<PurchaseResponse>> {
    if (organisationId) await platformService.getOrganisation(organisationId);
    return creditsService.listPurchases({ organisationId }, query);
  },

  async listOrganisationCreditTransactions(
    organisationId: string,
    { page, pageSize, ...period }: ListOrganisationCreditTransactionsRequest,
  ): Promise<Paginated<CreditTransactionResponse>> {
    await platformService.getOrganisation(organisationId);
    return creditsService.listWalletTransactions({ organisationId }, period, { page, pageSize });
  },

  async listPlatformAdmins({
    page,
    pageSize,
    ...filters
  }: ListPlatformAdminsRequest): Promise<Paginated<PlatformAdminResponse>> {
    const { rows, total } = await platformRepository.listPlatformAdmins(filters, {
      page,
      pageSize,
    });
    return toPaginated(rows.map(toPlatformAdminSummary), total, { page, pageSize });
  },

  createPlatformAdmin(input: CreatePlatformAdminRequest, actor: ActionActor) {
    return authService.createPlatformAdmin(input, actor);
  },

  async setPlatformAdminStatus(
    platformAdminId: string,
    status: ManageableStatus,
    actor: ActionActor,
  ): Promise<PlatformAdminResponse> {
    await authService.setPlatformAdminStatus(platformAdminId, status, actor);
    return authService.getPlatformAdmin(platformAdminId);
  },
};
