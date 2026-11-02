import { useEffect, useEffectEvent, useState } from 'react';

import { ApiError, type RequestOptions } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

interface QueryOptions {
  // false skips the request, e.g. until an id is known.
  enabled?: boolean;
}

interface SettledState<T> {
  requestId: string | null;
  key: string | null;
  response: ApiResponse<T> | undefined;
  error: ApiError | null;
}

// For every read (GET). Fetches on mount and whenever `key` changes, cancels the request on
// unmount, and never shows one record's data while another loads.
//   const { data, isLoading, error, refetch } =
//     useQuery(['members', params], (options) => api.members.list(params, options));
// `key` must change whenever the request changes; include every argument the fetcher uses.
export function useQuery<T>(
  key: readonly unknown[],
  fetcher: (options: RequestOptions) => Promise<ApiResponse<T>>,
  { enabled = true }: QueryOptions = {},
) {
  const keyString = JSON.stringify(key);
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<SettledState<T>>({
    requestId: null,
    key: null,
    response: undefined,
    error: null,
  });

  const requestId = `${keyString}#${version}`;
  const runFetch = useEffectEvent((signal: AbortSignal) => fetcher({ signal }));

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    runFetch(controller.signal).then(
      (response) => {
        if (controller.signal.aborted) return;
        setSettled({ requestId, key: keyString, response, error: null });
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        setSettled((previous) => ({
          requestId,
          key: keyString,
          // Keep the last good data for the same key, so a failed refetch does not blank the screen.
          response: previous.key === keyString ? previous.response : undefined,
          error: ApiError.from(caught),
        }));
      },
    );

    return () => controller.abort();
  }, [enabled, keyString, requestId]);

  // Loading state is derived, not stored, so no state is set synchronously inside the effect.
  const response = settled.key === keyString ? settled.response : undefined;
  const isFetching = enabled && settled.requestId !== requestId;

  return {
    data: response?.data,
    message: response?.message,
    response,
    error: settled.key === keyString ? settled.error : null,
    isLoading: isFetching && response === undefined,
    isFetching,
    refetch: () => setVersion((current) => current + 1),
  };
}
