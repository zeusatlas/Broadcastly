import type { StorageKey } from './storage_keys';

// expo-secure-store has no web support. Memory only, by design: localStorage is readable by any
// injected script, so on web the session deliberately does not survive a reload.
const memory = new Map<StorageKey, string>();

export const secureStorage = {
  get: async (key: StorageKey) => memory.get(key) ?? null,
  set: async (key: StorageKey, value: string) => {
    memory.set(key, value);
  },
  remove: async (key: StorageKey) => {
    memory.delete(key);
  },
};
