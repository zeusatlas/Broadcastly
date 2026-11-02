// The wire contract shared with the mobile app (mobile-ui/src/types/api/api_response.ts).
// Change both sides together, or not at all.

export const RESPONSE_STATUS = {
  success: 'success',
  error: 'error',
} as const;

export interface ApiResponse<T = undefined> {
  status: string;
  status_code: number;
  message: string;
  data: T;
}

export interface ErrorMessages {
  [key: string]: string[] | string;
}

// `status_code` and `message` extend the app's ErrorResponse; the app reads both when present.
export interface ErrorResponse {
  status: string;
  status_code: number;
  message: string;
  errors: ErrorMessages;
}
