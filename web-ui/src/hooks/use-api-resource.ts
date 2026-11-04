"use client";

import { useCallback, useEffect, useState } from "react";

type UseApiResourceOptions = {
  errorMessage?: string;
  getErrorMessage?: (error: unknown) => string;
  onError?: (error: unknown) => boolean;
};

function defaultErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Loads a client-side resource and ignores results from requests superseded by a newer load. */
export function useApiResource<T>(
  load: () => Promise<T>,
  {
    errorMessage = "Unable to load data.",
    getErrorMessage,
    onError,
  }: UseApiResourceOptions = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [completedRequest, setCompletedRequest] = useState<{
    load: typeof load;
    attempt: number;
  } | null>(null);
  const [requestFailure, setRequestFailure] = useState<{
    load: typeof load;
    attempt: number;
    message: string;
  } | null>(null);

  const isCurrentRequestComplete =
    completedRequest?.load === load && completedRequest.attempt === attempt;
  const error =
    requestFailure?.load === load && requestFailure.attempt === attempt
      ? requestFailure.message
      : "";
  const isLoading = !isCurrentRequestComplete;

  useEffect(() => {
    let active = true;

    void load()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          if (onError?.(requestError)) return;
          setRequestFailure({
            load,
            attempt,
            message:
              getErrorMessage?.(requestError) ??
              defaultErrorMessage(requestError, errorMessage),
          });
        }
      })
      .finally(() => {
        if (active) setCompletedRequest({ load, attempt });
      });

    return () => {
      active = false;
    };
  }, [attempt, errorMessage, getErrorMessage, load, onError]);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  const clearError = useCallback(() => {
    setRequestFailure(null);
  }, []);

  return { data, setData, error, clearError, isLoading, refresh };
}
