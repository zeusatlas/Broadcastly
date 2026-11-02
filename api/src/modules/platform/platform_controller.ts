import type { Request, Response } from 'express';

import type { PageParams } from '../../common/http/pagination';
import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth, type ActionActor } from '../auth';

import { platformService } from './platform_service';
import type {
  ConstituencyParams,
  CreateConstituencyRequest,
  ExecutiveParams,
  ListConstituenciesRequest,
  NewExecutiveRequest,
} from './platform_types';

const actorOf = (req: Request): ActionActor => ({
  executiveId: requireAuth(req).executiveId,
  context: getRequestContext(req),
});

export const platformController = {
  async getOverview(_req: Request, res: Response) {
    const data = await platformService.getOverview();
    return sendSuccess(res, { data, message: 'Overview retrieved.' });
  },

  async listConstituencies(_req: Request, res: Response) {
    const query = validated<ListConstituenciesRequest>(res, 'query');
    const data = await platformService.listConstituencies(query);
    return sendSuccess(res, { data, message: 'Constituencies retrieved.' });
  },

  async createConstituency(req: Request, res: Response) {
    const body = validated<CreateConstituencyRequest>(res, 'body');
    const data = await platformService.createConstituency(body, actorOf(req));
    return sendCreated(res, data, 'Constituency created.');
  },

  async getConstituency(_req: Request, res: Response) {
    const { constituencyId } = validated<ConstituencyParams>(res, 'params');
    const data = await platformService.getConstituency(constituencyId);
    return sendSuccess(res, { data, message: 'Constituency retrieved.' });
  },

  async appointChairman(req: Request, res: Response) {
    const { constituencyId } = validated<ConstituencyParams>(res, 'params');
    const body = validated<NewExecutiveRequest>(res, 'body');
    const data = await platformService.appointChairman(constituencyId, body, actorOf(req));
    return sendCreated(res, data, 'Chairman appointed.');
  },

  async listPlatformAdmins(_req: Request, res: Response) {
    const query = validated<PageParams>(res, 'query');
    const data = await platformService.listPlatformAdmins(query);
    return sendSuccess(res, { data, message: 'Platform admins retrieved.' });
  },

  async createPlatformAdmin(req: Request, res: Response) {
    const body = validated<NewExecutiveRequest>(res, 'body');
    const data = await platformService.createPlatformAdmin(body, actorOf(req));
    return sendCreated(res, data, 'Platform admin created.');
  },

  async suspendExecutive(req: Request, res: Response) {
    const { executiveId } = validated<ExecutiveParams>(res, 'params');
    const data = await platformService.suspendExecutive(executiveId, actorOf(req));
    return sendSuccess(res, { data, message: 'Account suspended.' });
  },

  async reactivateExecutive(req: Request, res: Response) {
    const { executiveId } = validated<ExecutiveParams>(res, 'params');
    const data = await platformService.reactivateExecutive(executiveId, actorOf(req));
    return sendSuccess(res, { data, message: 'Account reactivated.' });
  },
};
