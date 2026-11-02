import * as SecureStore from 'expo-secure-store';

import type { StorageKey } from './storage_keys';

// THIS_DEVICE_ONLY keeps tokens out of iCloud/device-transfer backups.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  get: (key: StorageKey) => SecureStore.getItemAsync(key, OPTIONS),
  set: (key: StorageKey, value: string) => SecureStore.setItemAsync(key, value, OPTIONS),
  remove: (key: StorageKey) => SecureStore.deleteItemAsync(key, OPTIONS),
};
