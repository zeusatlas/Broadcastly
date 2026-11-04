"use client";

import { useCallback, useSyncExternalStore } from "react";

type SetValue<T> = T | ((currentValue: T) => T);

const storageEventName = "broadcastly:local-storage";
const snapshotCache = new Map<string, { raw: string; value: unknown }>();

function subscribe(key: string, onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) onStoreChange();
  };
  const onLocalUpdate = (event: Event) => {
    if ((event as CustomEvent<string>).detail === key) onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(storageEventName, onLocalUpdate);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(storageEventName, onLocalUpdate);
  };
}

/** Reads storage after hydration while keeping server and initial client output in sync. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const getSnapshot = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const cached = snapshotCache.get(key);
      if (cached?.raw === raw) return cached.value as T;
      const value = JSON.parse(raw) as T;
      snapshotCache.set(key, { raw, value });
      return value;
    } catch {
      return initialValue;
    }
  }, [initialValue, key]);

  const value = useSyncExternalStore(
    useCallback((onStoreChange) => subscribe(key, onStoreChange), [key]),
    getSnapshot,
    () => initialValue,
  );

  const setValue = useCallback(
    (nextValue: SetValue<T>) => {
      const currentValue = getSnapshot();
      const resolvedValue =
        typeof nextValue === "function"
          ? (nextValue as (currentValue: T) => T)(currentValue)
          : nextValue;

      try {
        const raw = JSON.stringify(resolvedValue);
        window.localStorage.setItem(key, raw);
        snapshotCache.set(key, { raw, value: resolvedValue });
        window.dispatchEvent(new CustomEvent(storageEventName, { detail: key }));
      } catch {
        // Keep the persisted preference unchanged if storage is unavailable.
      }
    },
    [getSnapshot, key],
  );

  return [value, setValue] as const;
}
