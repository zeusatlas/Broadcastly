import { useRef, useState } from 'react';

import { ApiError } from '@/lib/api';

// For every write (POST/PUT/PATCH/DELETE). Ignores a second call while one is in flight,
// so a repeated tap cannot double-submit (FR-SMS-14). Never throws: read `error` instead.
//   const { mutate, data, isPending, error } = useMutation(api.members.create);
//   const response = await mutate(credentials); // ApiResponse<MemberResponse> | undefined
export function useMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const [data, setData] = useState<TResult | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const isInFlight = useRef(false);

  const mutate = async (args: TArgs): Promise<TResult | undefined> => {
    if (isInFlight.current) return undefined;

    isInFlight.current = true;
    setIsPending(true);
    setError(null);

    try {
      const result = await mutationFn(args);
      setData(result);
      return result;
    } catch (caught) {
      setError(ApiError.from(caught));
      return undefined;
    } finally {
      isInFlight.current = false;
      setIsPending(false);
    }
  };

  const reset = () => {
    setData(undefined);
    setError(null);
  };

  return { mutate, data, isPending, error, isError: error !== null, reset };
}
