import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendNoData, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';

import { requireAuth } from './auth_middleware';
import { authService } from './auth_service';
import type {
  RefreshTokenRequest,
  ResendOtpRequest,
  SessionParams,
  SignInRequest,
  SignOutRequest,
  VerifyOtpRequest,
} from './auth_types';

export const authController = {
  async signIn(req: Request, res: Response) {
    const body = validated<SignInRequest>(res, 'body');
    const data = await authService.signIn(body, getRequestContext(req));
    return sendSuccess(res, {
      data,
      message: `Code sent to ${data.maskedPhone}.`,
    });
  },

  async verifyOtp(req: Request, res: Response) {
    const body = validated<VerifyOtpRequest>(res, 'body');
    const data = await authService.verifyCode(body, getRequestContext(req));
    return sendSuccess(res, { data, message: 'Signed in successfully.' });
  },

  async resendOtp(req: Request, res: Response) {
    const body = validated<ResendOtpRequest>(res, 'body');
    const data = await authService.resendCode(body, getRequestContext(req));
    return sendSuccess(res, {
      data,
      message: `New code sent to ${data.maskedPhone}.`,
    });
  },

  async refresh(req: Request, res: Response) {
    const body = validated<RefreshTokenRequest>(res, 'body');
    const data = await authService.refresh(body, getRequestContext(req));
    return sendSuccess(res, { data, message: 'Session refreshed.' });
  },

  async signOut(req: Request, res: Response) {
    const body = validated<SignOutRequest>(res, 'body');
    await authService.signOut(requireAuth(req), body.allDevices ?? false, getRequestContext(req));
    return sendNoData(res, 'Signed out successfully.');
  },

  async listSessions(req: Request, res: Response) {
    const data = await authService.listSessions(requireAuth(req));
    return sendSuccess(res, { data, message: 'Sessions retrieved.' });
  },

  async revokeSession(req: Request, res: Response) {
    const { sessionId } = validated<SessionParams>(res, 'params');
    await authService.revokeOtherSession(requireAuth(req), sessionId, getRequestContext(req));
    return sendNoData(res, 'That device has been signed out.');
  },

  async me(req: Request, res: Response) {
    const data = await authService.getCurrentUser(requireAuth(req));
    return sendSuccess(res, { data, message: 'Current user retrieved.' });
  },
};
