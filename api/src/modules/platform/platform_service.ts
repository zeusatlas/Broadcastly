import { ConflictError, NotFoundError } from '../../common/errors/app_error';
import { toPaginated, type Paginated } from '../../common/http/pagination';
import { resolvePeriod, type PeriodParams } from '../../common/http/period';
import { removeUpload } from '../../common/uploads/image_upload';
import type { RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService } from '../audit';
import {
  actAsHead,
  auditActor,
  authService,
  loadProfileAccess,
  type AccessContext,
  type UserResponse,
  type ActionActor,
  type CreatePlatformAdminRequest,
  type ManageableStatus,
  type PlatformAdminResponse,
  type PlatformPermission,
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
  ReplaceHeadRequest,
  UpdateOrganisationRequest,
  OrganisationExecutiveResponse,
  OrganisationResponse,
  PlatformOverviewResponse,
  PlatformSettingsResponse,
  UpdatePlatformSettingsRequest,
} from './platform_types';
import { PlatformSettings } from './entities/platform_settings_entity';

const ORGANISATION_NOT_FOUND = 'Organisation not found.';
const EXECUTIVE_NOT_FOUND = 'Executive not found in this organisation.';
const NAME_TAKEN = 'An organisation with this name already exists.';

// The platform admin is the super admin: every organisation, its executives, and every admin.
export const platformService = {
  // The profile the app switches to while an admin works inside an organisation: the admin's own
  // name, the head's office and permissions. Each opening is audited.
  async openWorkspace(
    organisationId: string,
    admin: AccessContext,
    context: RequestContext,
  ): Promise<UserResponse> {
    const head = await actAsHead(admin, organisationId);
    const [user, access, organisation] = await Promise.all([
      authService.getUser('platform_admin', admin.accountId),
      loadProfileAccess(head.memberId!),
      platformService.getOrganisation(organisationId),
    ]);
    await auditService.record({
      action: AUDIT_ACTIONS.organisationOpened,
      targetType: 'organisation',
      targetId: organisationId,
      metadata: { organisationId },
      ...auditActor({ platformAdminId: admin.accountId, context }),
    });
    return {
      ...user,
      id: head.accountId,
      role: 'head',
      memberId: head.memberId,
      organisation: {
        id: organisation.id,
        name: organisation.name,
        type: organisation.type,
        logoUrl: organisation.logoUrl,
      },
      permissions: [...head.permissions],
      appointments: access.appointments,
    };
  },

  async getSettings(): Promise<PlatformSettingsResponse> {
    const [settings] = (await dataSource.query(
      `SELECT max_file_size_mb AS "maxFileSizeMb", max_rows_per_file AS "maxRowsPerFile",
              allowed_file_types AS "allowedFileTypes", notification_preferences AS "notificationPreferences"
         FROM platform_settings ORDER BY created_at LIMIT 1`,
    )) as Array<{
      maxFileSizeMb: number;
      maxRowsPerFile: number;
      allowedFileTypes: { csv: boolean; xlsx: boolean };
      notificationPreferences: PlatformSettingsResponse['notificationPreferences'];
    }>;
    if (!settings) throw new ConflictError('Platform settings are not configured.');
    return {
      importLimits: {
        maxFileSizeMb: settings.maxFileSizeMb,
        maxRowsPerFile: settings.maxRowsPerFile,
        allowedFileTypes: settings.allowedFileTypes,
      },
      notificationPreferences: settings.notificationPreferences,
    };
  },

  async updateSettings(
    input: UpdatePlatformSettingsRequest,
    actor: ActionActor,
  ): Promise<PlatformSettingsResponse> {
    await dataSource.transaction(async (manager) => {
      const [row] = (await manager.query(
        `SELECT id FROM platform_settings ORDER BY created_at LIMIT 1 FOR UPDATE`,
      )) as Array<{ id: string }>;
      if (!row) throw new ConflictError('Platform settings are not configured.');
      const settings = await manager
        .getRepository(PlatformSettings)
        .findOneByOrFail({ id: row.id });
      if (input.importLimits) {
        if (input.importLimits.maxFileSizeMb !== undefined)
          settings.maxFileSizeMb = input.importLimits.maxFileSizeMb;
        if (input.importLimits.maxRowsPerFile !== undefined)
          settings.maxRowsPerFile = input.importLimits.maxRowsPerFile;
        if (input.importLimits.allowedFileTypes)
          settings.allowedFileTypes = input.importLimits.allowedFileTypes;
      }
      if (input.notificationPreferences) {
        settings.notificationPreferences = {
          ...settings.notificationPreferences,
          ...input.notificationPreferences,
        };
      }
      await manager.getRepository(PlatformSettings).save(settings);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.platformSettingsUpdated,
          targetType: 'platform_settings',
          targetId: settings.id,
          metadata: {
            importLimits: Object.keys(input.importLimits ?? {}),
            notificationPreferences: Object.keys(input.notificationPreferences ?? {}),
          },
          ...auditActor(actor),
        },
        manager,
      );
    });
    return platformService.getSettings();
  },

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
          metadata: { organisationId: organisation.id, type: input.type },
          ...auditActor(actor),
        },
        manager,
      );
      return organisation;
    });

    return platformService.getOrganisation(id);
  },

  // The head is a member of this organisation promoted to executive; all rows commit together.
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

  async updateOrganisation(
    organisationId: string,
    { name, headTitle, description }: UpdateOrganisationRequest,
    actor: ActionActor,
  ): Promise<OrganisationResponse> {
    await dataSource.transaction(async (manager) => {
      const organisation = await organisationService.lockOrganisation(organisationId, manager);
      if (!organisation) throw new NotFoundError(ORGANISATION_NOT_FOUND);
      if (name && (await platformRepository.nameTakenByAnother(name, organisationId, manager))) {
        throw new ConflictError(NAME_TAKEN, { errors: { name: [NAME_TAKEN] } });
      }
      const changes = {
        ...(name && name !== organisation.name ? { name } : {}),
        ...(headTitle && headTitle !== organisation.headTitle ? { headTitle } : {}),
        ...(description !== undefined && description !== organisation.description
          ? { description }
          : {}),
      };
      if (Object.keys(changes).length === 0) return;
      await organisationService.updateDetails(organisationId, changes, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.organisationUpdated,
          targetType: 'organisation',
          targetId: organisationId,
          metadata: {
            ...(changes.name ? { previousName: organisation.name, name: changes.name } : {}),
            ...(changes.headTitle
              ? { previousHeadTitle: organisation.headTitle, headTitle: changes.headTitle }
              : {}),
            ...('description' in changes ? { descriptionChanged: true } : {}),
          },
          ...auditActor(actor),
        },
        manager,
      );
    });
    return platformService.getOrganisation(organisationId);
  },

  // Ends the current head's appointment and appoints the new head in one transaction. The old head
  // keeps their account, other positions and own credits; head-only access stops on their next request.
  async replaceHead(
    organisationId: string,
    request: ReplaceHeadRequest,
    actor: ActionActor,
  ): Promise<OrganisationResponse> {
    await dataSource.transaction(async (manager) => {
      const organisation = await organisationService.lockOrganisation(organisationId, manager);
      if (!organisation) throw new NotFoundError(ORGANISATION_NOT_FOUND);
      if (organisation.status !== 'active')
        throw new ConflictError('This organisation is inactive.');
      const current = await platformRepository.lockActiveHead(organisationId, manager);
      if (!current) {
        throw new ConflictError('This organisation has no head yet. Appoint one instead.');
      }

      let next: { executiveId: string; memberId: string };
      if ('executiveId' in request) {
        const executive = await platformRepository.findExecutiveInOrganisation(
          organisationId,
          request.executiveId,
          manager,
        );
        if (!executive) throw new NotFoundError(EXECUTIVE_NOT_FOUND);
        if (executive.id === current.executiveId) {
          throw new ConflictError('This executive is already the head.');
        }
        if (executive.status !== 'active') {
          throw new ConflictError('Only an active executive can become the head.');
        }
        next = { executiveId: executive.id, memberId: executive.memberId };
      } else {
        next = await authService.createExecutive({ ...request, organisationId }, actor, manager);
      }

      await organisationService.endAppointment(
        current.appointmentId,
        actor.executiveId ?? null,
        'Replaced as head by Broadcastly',
        manager,
      );
      const appointment = await organisationService.createAppointment(
        {
          memberId: next.memberId,
          positionId: CHAIRMAN_POSITION_ID,
          organisationId,
          unitId: null,
          appointedByExecutiveId: actor.executiveId ?? null,
        },
        manager,
      );
      await auditService.record(
        {
          action: AUDIT_ACTIONS.headReplaced,
          targetType: 'appointment',
          targetId: appointment.id,
          metadata: {
            organisationId,
            previousExecutiveId: current.executiveId,
            executiveId: next.executiveId,
          },
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

  getPlatformAdmin(platformAdminId: string) {
    return authService.getPlatformAdmin(platformAdminId);
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

  async updatePlatformAdminPermissions(
    platformAdminId: string,
    permissions: PlatformPermission[],
    actor: ActionActor,
  ): Promise<PlatformAdminResponse> {
    await authService.updatePlatformAdminPermissions(platformAdminId, permissions, actor);
    return authService.getPlatformAdmin(platformAdminId);
  },
};
