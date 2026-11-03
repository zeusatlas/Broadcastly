import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { actorFrom, requireAuth, type CreatePlatformAdminRequest } from '../auth';

import { platformService } from './platform_service';
import type {
  AppointChairmanRequest,
  CreateOrganisationRequest,
  ListOrganisationExecutivesRequest,
  ListOrganisationsRequest,
  ListPlatformAdminsRequest,
  OrganisationExecutiveParams,
  OrganisationParams,
  PlatformAdminParams,
} from './platform_types';

const actorOf = (req: Request) => actorFrom(requireAuth(req), getRequestContext(req));

export const platformController = {
  async getOverview(_req: Request, res: Response) {
    const data = await platformService.getOverview();
    return sendSuccess(res, { data, message: 'Overview retrieved.' });
  },

  async listOrganisations(_req: Request, res: Response) {
    const data = await platformService.listOrganisations(
      validated<ListOrganisationsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Organisations retrieved.' });
  },

  async createOrganisation(req: Request, res: Response) {
    const body = validated<CreateOrganisationRequest>(res, 'body');
    const data = await platformService.createOrganisation(body, actorOf(req));
    return sendCreated(res, data, 'Organisation created.');
  },

  async getOrganisation(_req: Request, res: Response) {
    const { organisationId } = validated<OrganisationParams>(res, 'params');
    const data = await platformService.getOrganisation(organisationId);
    return sendSuccess(res, { data, message: 'Organisation retrieved.' });
  },

  async appointChairman(req: Request, res: Response) {
    const { organisationId } = validated<OrganisationParams>(res, 'params');
    const body = validated<AppointChairmanRequest>(res, 'body');
    const data = await platformService.appointChairman(organisationId, body, actorOf(req));
    return sendCreated(res, data, 'Chairman appointed.');
  },

  async listOrganisationExecutives(_req: Request, res: Response) {
    const { organisationId } = validated<OrganisationParams>(res, 'params');
    const query = validated<ListOrganisationExecutivesRequest>(res, 'query');
    const data = await platformService.listOrganisationExecutives(organisationId, query);
    return sendSuccess(res, { data, message: 'Executives retrieved.' });
  },

  async getOrganisationExecutive(_req: Request, res: Response) {
    const { organisationId, executiveId } = validated<OrganisationExecutiveParams>(res, 'params');
    const data = await platformService.getOrganisationExecutive(organisationId, executiveId);
    return sendSuccess(res, { data, message: 'Executive retrieved.' });
  },

  async suspendExecutive(req: Request, res: Response) {
    const { organisationId, executiveId } = validated<OrganisationExecutiveParams>(res, 'params');
    const data = await platformService.setExecutiveStatus(
      organisationId,
      executiveId,
      'suspended',
      actorOf(req),
    );
    return sendSuccess(res, { data, message: 'Account suspended.' });
  },

  async reactivateExecutive(req: Request, res: Response) {
    const { organisationId, executiveId } = validated<OrganisationExecutiveParams>(res, 'params');
    const data = await platformService.setExecutiveStatus(
      organisationId,
      executiveId,
      'active',
      actorOf(req),
    );
    return sendSuccess(res, { data, message: 'Account reactivated.' });
  },

  async listPlatformAdmins(_req: Request, res: Response) {
    const data = await platformService.listPlatformAdmins(
      validated<ListPlatformAdminsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Platform admins retrieved.' });
  },

  async createPlatformAdmin(req: Request, res: Response) {
    const body = validated<CreatePlatformAdminRequest>(res, 'body');
    const data = await platformService.createPlatformAdmin(body, actorOf(req));
    return sendCreated(res, data, 'Platform admin created.');
  },

  async suspendPlatformAdmin(req: Request, res: Response) {
    const { platformAdminId } = validated<PlatformAdminParams>(res, 'params');
    const data = await platformService.setPlatformAdminStatus(
      platformAdminId,
      'suspended',
      actorOf(req),
    );
    return sendSuccess(res, { data, message: 'Account suspended.' });
  },

  async reactivatePlatformAdmin(req: Request, res: Response) {
    const { platformAdminId } = validated<PlatformAdminParams>(res, 'params');
    const data = await platformService.setPlatformAdminStatus(
      platformAdminId,
      'active',
      actorOf(req),
    );
    return sendSuccess(res, { data, message: 'Account reactivated.' });
  },
};
