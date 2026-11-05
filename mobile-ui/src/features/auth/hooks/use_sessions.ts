import { useMutation } from '@/hooks/use_mutation';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

export const useReadSessionsQuery = () =>
  useQuery(['auth', 'sessions'], (options) => api.auth.readSessions(options));

export const useRevokeSessionMutation = () => useMutation(api.auth.revokeSession);
