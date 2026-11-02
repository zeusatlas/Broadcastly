import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

interface ReadOptions {
  // false for callers the API would refuse (no appointment.manage), so no request is wasted.
  enabled?: boolean;
}

export const useReadOrganisationOverviewQuery = ({ enabled }: ReadOptions = {}) =>
  useQuery(['organisation', 'overview'], (options) => api.organisation.readOverview(options), {
    enabled,
  });

export const useReadPositionsQuery = ({ enabled }: ReadOptions = {}) =>
  useQuery(['organisation', 'positions'], (options) => api.organisation.readPositions(options), {
    enabled,
  });
