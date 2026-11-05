import { http, type RequestOptions } from '@/lib/api';

import type {
  OrganisationNotificationPreferences,
  UpdateOrganisationNotificationPreferencesRequest,
} from '../types';

export const notificationsEndpoints = {
  readOrganisationPreferences: (options?: RequestOptions) =>
    http.get<OrganisationNotificationPreferences>('/organisation/notification-preferences', options),

  updateOrganisationPreferences: (
    credentials: UpdateOrganisationNotificationPreferencesRequest,
  ) =>
    http.patch<
      OrganisationNotificationPreferences,
      UpdateOrganisationNotificationPreferencesRequest
    >('/organisation/notification-preferences', credentials),
};
