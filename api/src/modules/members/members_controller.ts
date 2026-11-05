import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { membersService } from './members_service';
import type {
  CreateMemberRequest,
  ListMembersRequest,
  MemberParams,
  UpdateMemberRequest,
} from './members_types';

const memberIdOf = (res: Response) => validated<MemberParams>(res, 'params').memberId;

export const membersController = {
  async list(req: Request, res: Response) {
    const data = await membersService.list(
      requireAuth(req),
      validated<ListMembersRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Members retrieved.' });
  },

  async get(req: Request, res: Response) {
    const data = await membersService.get(requireAuth(req), memberIdOf(res));
    return sendSuccess(res, { data, message: 'Member retrieved.' });
  },

  async create(req: Request, res: Response) {
    const body = validated<CreateMemberRequest>(res, 'body');
    const data = await membersService.create(requireAuth(req), body, getRequestContext(req));
    return sendCreated(res, data, 'Member created.');
  },

  async update(req: Request, res: Response) {
    const body = validated<UpdateMemberRequest>(res, 'body');
    const data = await membersService.update(
      requireAuth(req),
      memberIdOf(res),
      body,
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Member updated.' });
  },

  async deactivate(req: Request, res: Response) {
    const data = await membersService.deactivate(
      requireAuth(req),
      memberIdOf(res),
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Member deactivated.' });
  },

  async reactivate(req: Request, res: Response) {
    const data = await membersService.reactivate(
      requireAuth(req),
      memberIdOf(res),
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Member reactivated.' });
  },
};
