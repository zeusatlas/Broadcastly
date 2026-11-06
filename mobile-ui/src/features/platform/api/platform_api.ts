import { http, type RequestOptions } from '@/lib/api';
import type { Paginated } from '@/types/api';
import type { User } from '@/types/models';

import type {
  AppointHeadRequest,
  AuditEventResponse,
  CreateCreditAdjustmentRequest,
  CreateOrganisationRequest,
  CreatePlatformAdminRequest,
  ListOrganisationExecutivesParams,
  ListOrganisationsParams,
  ListPlatformAdminsParams,
  OrganisationExecutiveResponse,
  ListAuditLogParams,
  ListPlatformBroadcastsParams,
  ListPlatformNotificationsParams,
  PlatformNotificationResponse,
  ListPlatformCreditTransactionsParams,
  ListPlatformPurchasesParams,
  OrganisationResponse,
  PlatformAdminResponse,
  PlatformBroadcastResponse,
  PlatformCreditTransactionResponse,
  PlatformOverviewResponse,
  PlatformPeriod,
  PlatformPurchaseResponse,
  PlatformSettingsResponse,
  PurchaseSummaryResponse,
  ReplaceHeadRequest,
  UpdateOrganisationRequest,
  UpdatePlatformAdminPermissionsRequest,
  UpdatePlatformSettingsRequest,
} from '../types';

// Platform admin endpoints (api/src/modules/platform). The API checks the role and each permission.
export const platformEndpoints = {
  readNotifications: (params: ListPlatformNotificationsParams, options?: RequestOptions) =>
    http.get<Paginated<PlatformNotificationResponse>>('/platform/notifications', {
      ...options,
      params,
    }),

  readUnreadCount: (options?: RequestOptions) =>
    http.get<{ unread: number }>('/platform/notifications/unread-count', options),

  markNotificationRead: ({ notificationId }: { notificationId: string }) =>
    http.post<{ unread: number }>(`/platform/notifications/${notificationId}/read`),

  markAllNotificationsRead: () => http.post<{ unread: number }>('/platform/notifications/read-all'),

  openWorkspace: ({ uuid }: { uuid: string }) =>
    http.post<User>(`/platform/organisations/${uuid}/workspace`),

  readOverview: (options?: RequestOptions) =>
    http.get<PlatformOverviewResponse>('/platform/overview', options),

  readOrganisations: (params: ListOrganisationsParams, options?: RequestOptions) =>
    http.get<Paginated<OrganisationResponse>>('/platform/organisations', { ...options, params }),

  readOrganisation: ({ uuid }: { uuid: string }, options?: RequestOptions) =>
    http.get<OrganisationResponse>(`/platform/organisations/${uuid}`, options),

  createOrganisation: (credentials: CreateOrganisationRequest) =>
    http.post<OrganisationResponse, CreateOrganisationRequest>(
      '/platform/organisations',
      credentials,
    ),

  appointHead: ({ uuid, credentials }: { uuid: string; credentials: AppointHeadRequest }) =>
    http.post<OrganisationResponse, AppointHeadRequest>(
      `/platform/organisations/${uuid}/head`,
      credentials,
    ),

  updateOrganisation: ({
    uuid,
    credentials,
  }: {
    uuid: string;
    credentials: UpdateOrganisationRequest;
  }) =>
    http.patch<OrganisationResponse, UpdateOrganisationRequest>(
      `/platform/organisations/${uuid}`,
      credentials,
    ),

  replaceHead: ({ uuid, credentials }: { uuid: string; credentials: ReplaceHeadRequest }) =>
    http.post<OrganisationResponse, ReplaceHeadRequest>(
      `/platform/organisations/${uuid}/head/replace`,
      credentials,
    ),

  suspendOrganisation: ({ uuid }: { uuid: string }) =>
    http.post<OrganisationResponse>(`/platform/organisations/${uuid}/suspend`),

  reactivateOrganisation: ({ uuid }: { uuid: string }) =>
    http.post<OrganisationResponse>(`/platform/organisations/${uuid}/reactivate`),

  readOrganisationExecutives: (
    { uuid, params }: { uuid: string; params: ListOrganisationExecutivesParams },
    options?: RequestOptions,
  ) =>
    http.get<Paginated<OrganisationExecutiveResponse>>(
      `/platform/organisations/${uuid}/executives`,
      { ...options, params },
    ),

  readOrganisationExecutive: (
    { uuid, executiveId }: { uuid: string; executiveId: string },
    options?: RequestOptions,
  ) =>
    http.get<OrganisationExecutiveResponse>(
      `/platform/organisations/${uuid}/executives/${executiveId}`,
      options,
    ),

  // Multipart, field "logo"; PNG, JPEG or WebP up to 2 MB, checked by content on the server.
  uploadOrganisationLogo: ({ uuid, form }: { uuid: string; form: FormData }) =>
    http.upload<OrganisationResponse>(`/platform/organisations/${uuid}/logo`, form),

  removeOrganisationLogo: ({ uuid }: { uuid: string }) =>
    http.delete<OrganisationResponse>(`/platform/organisations/${uuid}/logo`),

  suspendExecutive: ({ uuid, executiveId }: { uuid: string; executiveId: string }) =>
    http.post<OrganisationExecutiveResponse>(
      `/platform/organisations/${uuid}/executives/${executiveId}/suspend`,
    ),

  reactivateExecutive: ({ uuid, executiveId }: { uuid: string; executiveId: string }) =>
    http.post<OrganisationExecutiveResponse>(
      `/platform/organisations/${uuid}/executives/${executiveId}/reactivate`,
    ),

  readPlatformAdmins: (params: ListPlatformAdminsParams, options?: RequestOptions) =>
    http.get<Paginated<PlatformAdminResponse>>('/platform/admins', { ...options, params }),

  readPlatformAdmin: ({ uuid }: { uuid: string }, options?: RequestOptions) =>
    http.get<PlatformAdminResponse>(`/platform/admins/${uuid}`, options),

  createPlatformAdmin: (credentials: CreatePlatformAdminRequest) =>
    http.post<PlatformAdminResponse, CreatePlatformAdminRequest>('/platform/admins', credentials),

  suspendPlatformAdmin: ({ uuid }: { uuid: string }) =>
    http.post<PlatformAdminResponse>(`/platform/admins/${uuid}/suspend`),

  reactivatePlatformAdmin: ({ uuid }: { uuid: string }) =>
    http.post<PlatformAdminResponse>(`/platform/admins/${uuid}/reactivate`),

  readPurchases: (params: ListPlatformPurchasesParams, options?: RequestOptions) =>
    http.get<Paginated<PlatformPurchaseResponse>>('/platform/purchases', { ...options, params }),

  readPurchaseSummary: (params: { period?: PlatformPeriod }, options?: RequestOptions) =>
    http.get<PurchaseSummaryResponse>('/platform/purchases/summary', { ...options, params }),

  readCreditTransactions: (
    params: ListPlatformCreditTransactionsParams,
    options?: RequestOptions,
  ) =>
    http.get<Paginated<PlatformCreditTransactionResponse>>('/platform/credit-transactions', {
      ...options,
      params,
    }),

  createCreditAdjustment: ({
    credentials,
    idempotencyKey,
  }: {
    credentials: CreateCreditAdjustmentRequest;
    idempotencyKey: string;
  }) =>
    http.post<PlatformCreditTransactionResponse, CreateCreditAdjustmentRequest>(
      '/platform/credit-adjustments',
      credentials,
      { idempotencyKey },
    ),

  readBroadcasts: (params: ListPlatformBroadcastsParams, options?: RequestOptions) =>
    http.get<Paginated<PlatformBroadcastResponse>>('/platform/broadcasts', { ...options, params }),

  readAuditLog: (params: ListAuditLogParams, options?: RequestOptions) =>
    http.get<Paginated<AuditEventResponse>>('/platform/audit-log', { ...options, params }),

  readSettings: (options?: RequestOptions) =>
    http.get<PlatformSettingsResponse>('/platform/settings', options),

  updateSettings: (credentials: UpdatePlatformSettingsRequest) =>
    http.patch<PlatformSettingsResponse, UpdatePlatformSettingsRequest>(
      '/platform/settings',
      credentials,
    ),

  updatePlatformAdminPermissions: ({
    uuid,
    credentials,
  }: {
    uuid: string;
    credentials: UpdatePlatformAdminPermissionsRequest;
  }) =>
    http.patch<PlatformAdminResponse, UpdatePlatformAdminPermissionsRequest>(
      `/platform/admins/${uuid}/permissions`,
      credentials,
    ),
};
