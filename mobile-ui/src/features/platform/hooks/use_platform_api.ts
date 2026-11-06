import { useMutation } from '@/hooks/use_mutation';
import { PAGE_SIZE, usePages } from '@/hooks/use_pages';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type {
  ListOrganisationExecutivesParams,
  ListOrganisationsParams,
  AuditEventResponse,
  ListAuditLogParams,
  ListPlatformAdminsParams,
  ListPlatformBroadcastsParams,
  ListPlatformCreditTransactionsParams,
  ListPlatformPurchasesParams,
  OrganisationExecutiveResponse,
  PlatformBroadcastResponse,
  PlatformCreditTransactionResponse,
  PlatformPeriod,
  PlatformPurchaseResponse,
  OrganisationResponse,
  PlatformAdminResponse,
  PlatformNotificationResponse,
} from '../types';

type Filters<P> = Omit<P, 'page' | 'pageSize'>;

// Paged lists: every page loaded so far for one set of filters, loading more on scroll.
export const useOrganisationPages = (filters: Filters<ListOrganisationsParams>) =>
  usePages<OrganisationResponse>(`platform-organisations:${JSON.stringify(filters)}`, (page, o) =>
    api.platform.readOrganisations({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const usePlatformAdminPages = (filters: Filters<ListPlatformAdminsParams>) =>
  usePages<PlatformAdminResponse>(`platform-admins:${JSON.stringify(filters)}`, (page, o) =>
    api.platform.readPlatformAdmins({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const useOrganisationExecutivePages = (
  uuid: string,
  filters: Filters<ListOrganisationExecutivesParams>,
) =>
  usePages<OrganisationExecutiveResponse>(
    `platform-organisation-executives:${uuid}:${JSON.stringify(filters)}`,
    (page, o) =>
      api.platform.readOrganisationExecutives(
        { uuid, params: { ...filters, page, pageSize: PAGE_SIZE } },
        o,
      ),
  );

export const usePlatformNotificationPages = (filter: 'all' | 'unread' | 'read', search: string) =>
  usePages<PlatformNotificationResponse>(`platform-notifications:${filter}:${search}`, (page, o) =>
    api.platform.readNotifications(
      {
        page,
        pageSize: PAGE_SIZE,
        status: filter === 'all' ? undefined : filter,
        search: search || undefined,
      },
      o,
    ),
  );

export const useReadPlatformUnreadCountQuery = () =>
  useQuery(['platform', 'notifications', 'unread-count'], (options) =>
    api.platform.readUnreadCount(options),
  );

export const useMarkPlatformNotificationReadMutation = () =>
  useMutation(api.platform.markNotificationRead);

export const useMarkAllPlatformNotificationsReadMutation = () =>
  useMutation(api.platform.markAllNotificationsRead);

export const useOpenWorkspaceMutation = () => useMutation(api.platform.openWorkspace);

export const useReadPlatformOverviewQuery = () =>
  useQuery(['platform', 'overview'], (options) => api.platform.readOverview(options));

export const useReadOrganisationsQuery = (params: ListOrganisationsParams) =>
  useQuery(['platform', 'organisations', params], (options) =>
    api.platform.readOrganisations(params, options),
  );

export const useReadOrganisationQuery = (uuid: string) =>
  useQuery(['platform', 'organisation', uuid], (options) =>
    api.platform.readOrganisation({ uuid }, options),
  );

export const useReadOrganisationExecutivesQuery = (
  uuid: string,
  params: ListOrganisationExecutivesParams,
) =>
  useQuery(['platform', 'organisation', uuid, 'executives', params], (options) =>
    api.platform.readOrganisationExecutives({ uuid, params }, options),
  );

export const useReadPlatformAdminsQuery = (params: ListPlatformAdminsParams) =>
  useQuery(['platform', 'admins', params], (options) =>
    api.platform.readPlatformAdmins(params, options),
  );

export const useReadPlatformAdminQuery = (uuid: string) =>
  useQuery(['platform', 'admin', uuid], (options) =>
    api.platform.readPlatformAdmin({ uuid }, options),
  );

export const useCreateOrganisationMutation = () => useMutation(api.platform.createOrganisation);
export const useAppointHeadMutation = () => useMutation(api.platform.appointHead);
export const useSuspendOrganisationMutation = () => useMutation(api.platform.suspendOrganisation);
export const useReactivateOrganisationMutation = () =>
  useMutation(api.platform.reactivateOrganisation);
export const useSuspendExecutiveMutation = () => useMutation(api.platform.suspendExecutive);
export const useReactivateExecutiveMutation = () => useMutation(api.platform.reactivateExecutive);
export const useCreatePlatformAdminMutation = () => useMutation(api.platform.createPlatformAdmin);
export const useSuspendPlatformAdminMutation = () => useMutation(api.platform.suspendPlatformAdmin);
export const useReactivatePlatformAdminMutation = () =>
  useMutation(api.platform.reactivatePlatformAdmin);
export const useUpdatePlatformAdminPermissionsMutation = () =>
  useMutation(api.platform.updatePlatformAdminPermissions);

export const usePlatformPurchasePages = (filters: Filters<ListPlatformPurchasesParams>) =>
  usePages<PlatformPurchaseResponse>(`platform-purchases:${JSON.stringify(filters)}`, (page, o) =>
    api.platform.readPurchases({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const useReadPurchaseSummaryQuery = (period?: PlatformPeriod) =>
  useQuery(['platform', 'purchase-summary', period], (options) =>
    api.platform.readPurchaseSummary({ period }, options),
  );

export const usePlatformCreditPages = (filters: Filters<ListPlatformCreditTransactionsParams>) =>
  usePages<PlatformCreditTransactionResponse>(
    `platform-credits:${JSON.stringify(filters)}`,
    (page, o) => api.platform.readCreditTransactions({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const useCreateCreditAdjustmentMutation = () =>
  useMutation(api.platform.createCreditAdjustment);

export const usePlatformBroadcastPages = (filters: Filters<ListPlatformBroadcastsParams>) =>
  usePages<PlatformBroadcastResponse>(`platform-broadcasts:${JSON.stringify(filters)}`, (page, o) =>
    api.platform.readBroadcasts({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const useAuditLogPages = (filters: Filters<ListAuditLogParams>) =>
  usePages<AuditEventResponse>(`platform-audit:${JSON.stringify(filters)}`, (page, o) =>
    api.platform.readAuditLog({ ...filters, page, pageSize: PAGE_SIZE }, o),
  );

export const useReadPlatformSettingsQuery = () =>
  useQuery(['platform', 'settings'], (options) => api.platform.readSettings(options));

export const useUpdatePlatformSettingsMutation = () => useMutation(api.platform.updateSettings);

export const useUpdateOrganisationMutation = () => useMutation(api.platform.updateOrganisation);
export const useReplaceHeadMutation = () => useMutation(api.platform.replaceHead);

export const useReadOrganisationExecutiveQuery = (uuid: string, executiveId: string) =>
  useQuery(
    ['platform', 'organisation', uuid, 'executive', executiveId],
    (options) => api.platform.readOrganisationExecutive({ uuid, executiveId }, options),
    { enabled: Boolean(executiveId) },
  );

export const useFindExecutiveByMemberQuery = (uuid: string, memberId: string | undefined) =>
  useQuery(
    ['platform', 'organisation', uuid, 'executive-of-member', memberId],
    (options) =>
      api.platform.readOrganisationExecutives(
        { uuid, params: { memberId, page: 1, pageSize: 1 } },
        options,
      ),
    { enabled: Boolean(memberId) },
  );

export const useUploadOrganisationLogoMutation = () =>
  useMutation(api.platform.uploadOrganisationLogo);
export const useRemoveOrganisationLogoMutation = () =>
  useMutation(api.platform.removeOrganisationLogo);
