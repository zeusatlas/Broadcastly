import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendNoData, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { toStoredPath } from '../../common/uploads/image_upload';
import { actorFrom, requireAuth } from '../auth';
import { platformService } from '../platform';

import { chairmanService } from './chairman_service';
import type {
  AppointmentParams,
  AppointmentRequest,
  CreateOrganisationExecutiveRequest,
  CreatePositionRequest,
  CreateUnitRequest,
  EndAppointmentRequest,
  ExecutiveParams,
  ListExecutivesRequest,
  ListUnitsRequest,
  PositionParams,
  UpdatePositionRequest,
} from './chairman_types';

// The chairman's own organisation only; the same logo rules as the platform admin's.
async function setOwnLogo(req: Request, logoPath: string | null) {
  const auth = requireAuth(req);
  const organisation = await platformService.setOrganisationLogo(
    auth.organisationId!,
    logoPath,
    actorFrom(auth, getRequestContext(req)),
  );
  return { logoUrl: organisation.logoUrl };
}

export const chairmanController = {
  async uploadLogo(req: Request, res: Response) {
    const data = await setOwnLogo(req, toStoredPath(req.file!.path));
    return sendSuccess(res, { data, message: 'Logo updated.' });
  },

  async removeLogo(req: Request, res: Response) {
    const data = await setOwnLogo(req, null);
    return sendSuccess(res, { data, message: 'Logo removed.' });
  },

  async getOverview(req: Request, res: Response) {
    const data = await chairmanService.getOverview(requireAuth(req));
    return sendSuccess(res, { data, message: 'Overview retrieved.' });
  },

  async listPositions(req: Request, res: Response) {
    const data = await chairmanService.listPositions(requireAuth(req));
    return sendSuccess(res, { data, message: 'Positions retrieved.' });
  },

  async createPosition(req: Request, res: Response) {
    const body = validated<CreatePositionRequest>(res, 'body');
    const data = await chairmanService.createPosition(
      requireAuth(req),
      body,
      getRequestContext(req),
    );
    return sendCreated(res, data, 'Position created.');
  },

  async updatePosition(req: Request, res: Response) {
    const { positionId } = validated<PositionParams>(res, 'params');
    const body = validated<UpdatePositionRequest>(res, 'body');
    const data = await chairmanService.updatePosition(
      requireAuth(req),
      positionId,
      body,
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Position updated.' });
  },

  async listUnits(req: Request, res: Response) {
    const query = validated<ListUnitsRequest>(res, 'query');
    const data = await chairmanService.listUnits(requireAuth(req), query);
    return sendSuccess(res, { data, message: 'Units retrieved.' });
  },

  async createUnit(req: Request, res: Response) {
    const body = validated<CreateUnitRequest>(res, 'body');
    const data = await chairmanService.createUnit(requireAuth(req), body, getRequestContext(req));
    return sendCreated(res, data, 'Unit created.');
  },

  async listExecutives(req: Request, res: Response) {
    const query = validated<ListExecutivesRequest>(res, 'query');
    const data = await chairmanService.listExecutives(requireAuth(req), query);
    return sendSuccess(res, { data, message: 'Executives retrieved.' });
  },

  async getExecutive(req: Request, res: Response) {
    const { executiveId } = validated<ExecutiveParams>(res, 'params');
    const data = await chairmanService.getExecutive(requireAuth(req), executiveId);
    return sendSuccess(res, { data, message: 'Executive retrieved.' });
  },

  async createExecutive(req: Request, res: Response) {
    const body = validated<CreateOrganisationExecutiveRequest>(res, 'body');
    const data = await chairmanService.createExecutive(
      requireAuth(req),
      body,
      getRequestContext(req),
    );
    return sendCreated(res, data, 'Executive appointed.');
  },

  async addAppointment(req: Request, res: Response) {
    const { executiveId } = validated<ExecutiveParams>(res, 'params');
    const body = validated<AppointmentRequest>(res, 'body');
    const data = await chairmanService.addAppointment(
      requireAuth(req),
      executiveId,
      body,
      getRequestContext(req),
    );
    return sendCreated(res, data, 'Appointment added.');
  },

  async endAppointment(req: Request, res: Response) {
    const { appointmentId } = validated<AppointmentParams>(res, 'params');
    const { reason } = validated<EndAppointmentRequest>(res, 'body');
    await chairmanService.endAppointment(
      requireAuth(req),
      appointmentId,
      reason,
      getRequestContext(req),
    );
    return sendNoData(res, 'Appointment ended.');
  },

  async suspendExecutive(req: Request, res: Response) {
    const { executiveId } = validated<ExecutiveParams>(res, 'params');
    const data = await chairmanService.setExecutiveStatus(
      requireAuth(req),
      executiveId,
      'suspended',
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Account suspended.' });
  },

  async reactivateExecutive(req: Request, res: Response) {
    const { executiveId } = validated<ExecutiveParams>(res, 'params');
    const data = await chairmanService.setExecutiveStatus(
      requireAuth(req),
      executiveId,
      'active',
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Account reactivated.' });
  },
};
