import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import type { ApiResponse } from '@/types/api';

import { axiosClient } from './client';

export interface RequestOptions {
  // Any request interface, e.g. PageParams or a feature's ListMembersRequest.
  params?: object;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeout?: number;
  skipAuthRefresh?: boolean;
  // Required on dispatch and credit writes so a retry can never double-fire (FR-SMS-14, NFR-REL-03).
  idempotencyKey?: string;
}

export interface UploadOptions extends RequestOptions {
  onProgress?: (fraction: number) => void;
}

function toConfig({ idempotencyKey, headers, ...rest }: RequestOptions = {}): AxiosRequestConfig {
  return {
    ...rest,
    headers: idempotencyKey ? { ...headers, 'Idempotency-Key': idempotencyKey } : headers,
  };
}

function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
  return response.data;
}

// Every method resolves to the full envelope { status, status_code, message, data }.
// T is the `data` payload; omit it for endpoints that return no data.
// Failures never resolve: they reject with an ApiError (see errors.ts).
export const http = {
  get: <T = undefined>(url: string, options?: RequestOptions) =>
    axiosClient.get<ApiResponse<T>>(url, toConfig(options)).then(unwrap),

  post: <T = undefined, B = unknown>(url: string, body?: B, options?: RequestOptions) =>
    axiosClient.post<ApiResponse<T>>(url, body, toConfig(options)).then(unwrap),

  put: <T = undefined, B = unknown>(url: string, body?: B, options?: RequestOptions) =>
    axiosClient.put<ApiResponse<T>>(url, body, toConfig(options)).then(unwrap),

  patch: <T = undefined, B = unknown>(url: string, body?: B, options?: RequestOptions) =>
    axiosClient.patch<ApiResponse<T>>(url, body, toConfig(options)).then(unwrap),

  delete: <T = undefined>(url: string, options?: RequestOptions) =>
    axiosClient.delete<ApiResponse<T>>(url, toConfig(options)).then(unwrap),

  // Spreadsheet imports (FR-MEM-02, FR-ORG-04). Never JSON-encode a file.
  upload: <T = undefined>(
    url: string,
    form: FormData,
    { onProgress, ...options }: UploadOptions = {},
  ) => {
    const config = toConfig(options);

    return axiosClient
      .post<ApiResponse<T>>(url, form, {
        ...config,
        headers: { ...config.headers, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress
          ? (event) => event.total && onProgress(event.loaded / event.total)
          : undefined,
      })
      .then(unwrap);
  },
};
