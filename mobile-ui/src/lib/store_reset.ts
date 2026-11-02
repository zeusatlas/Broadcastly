const resetters = new Set<() => void>();

// Every feature store registers here so sign-out leaves no member data behind (NFR-PRIV-01).
export function registerStoreReset(reset: () => void): void {
  resetters.add(reset);
}

export function resetAllStores(): void {
  resetters.forEach((reset) => reset());
}
