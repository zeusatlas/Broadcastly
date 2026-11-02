// The only code that moves credits. One DB transaction with row locks per movement; idempotency key per request (NFR-REL-03).
export {};
