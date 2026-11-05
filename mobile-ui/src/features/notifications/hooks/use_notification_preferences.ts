import { useMutation } from '@/hooks/use_mutation';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

import type { UpdateOrganisationNotificationPreferencesRequest } from '../types';

export const useReadNotificationPreferencesQuery = () =>
  useQuery(['notifications', 'preferences'], (options) =>
    api.notifications.readOrganisationPreferences(options),
  );

export const useUpdateNotificationPreferencesMutation = () =>
  useMutation((credentials: UpdateOrganisationNotificationPreferencesRequest) =>
    api.notifications.updateOrganisationPreferences(credentials),
  );
