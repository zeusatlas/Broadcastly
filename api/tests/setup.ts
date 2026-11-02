// Runs before every test file, before src/config/env.ts is imported. Values are test-only;
// the current tests never open a database or Redis connection.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USERNAME ??= 'broadcastly';
process.env.DB_PASSWORD ??= 'broadcastly';
process.env.DB_NAME ??= 'broadcastly_test';
process.env.REDIS_URL ??= 'redis://localhost:6380/1';
process.env.JWT_ACCESS_SECRET ??= 'test-secret-that-is-at-least-thirty-two-characters';
process.env.JWT_ACCESS_TTL = '15m';
process.env.API_DOCS_ENABLED = 'true';
