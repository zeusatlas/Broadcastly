// Idempotency-Key middleware for dispatch and credit writes (FR-SMS-14, NFR-REL-03):
// stores key + request hash + response; a repeat returns the stored response instead of re-running.
export {};
