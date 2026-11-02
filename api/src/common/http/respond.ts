import type { Response } from 'express';

import { RESPONSE_STATUS, type ApiResponse } from './api_response';

interface SuccessOptions<T> {
  data?: T;
  message?: string;
  statusCode?: number;
}

// The only way a controller sends a success response, so every endpoint emits the same envelope.
// Omit `data` for endpoints that return none; the app then reads data as undefined.
export function sendSuccess<T = undefined>(
  res: Response,
  { data, message = 'Request successful.', statusCode = 200 }: SuccessOptions<T> = {},
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    status: RESPONSE_STATUS.success,
    status_code: statusCode,
    message,
    data,
  });
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully.') {
  return sendSuccess(res, { data, message, statusCode: 201 });
}

export function sendNoData(res: Response, message: string) {
  return sendSuccess(res, { message });
}
