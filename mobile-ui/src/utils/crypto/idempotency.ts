import { randomUUID } from 'expo-crypto';

// Create one key per user intent (e.g. when the confirm sheet opens), not per request,
// so a retry of the same send reuses it and the backend can drop the duplicate.
export function createIdempotencyKey(): string {
  return randomUUID();
}
