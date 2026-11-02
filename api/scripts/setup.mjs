// `npm run setup`: first-run helper. Creates .env from .env.example with a fresh JWT secret.
// Never overwrites an existing .env.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 24 || (major === 24 && minor < 11)) {
  console.error(`Node.js 24.11 or newer is required (found ${process.versions.node}).`);
  process.exit(1);
}

if (existsSync('.env')) {
  console.log('.env already exists — left unchanged.');
} else {
  copyFileSync('.env.example', '.env');
  const secret = randomBytes(48).toString('base64url');
  const env = readFileSync('.env', 'utf8').replace(
    /^JWT_ACCESS_SECRET=.*$/m,
    `JWT_ACCESS_SECRET=${secret}`,
  );
  writeFileSync('.env', env);
  console.log('Created .env with a new JWT_ACCESS_SECRET.');
}

console.log(`
Next:
  1. Database (PostgreSQL 17) — put your connection details in .env (DB_*), then either:
       a) let the API create it: DB_AUTO_CREATE=true (your DB_USERNAME needs CREATEDB), or
       b) create it yourself: run scripts/create_database.sql in pgAdmin, or
       c) Docker: npm run services:up and set DB_PORT=55432
  2. Redis:            npm run services:up (also starts PostgreSQL in Docker)
  3. Start the API:    npm run dev   (DB_AUTO_MIGRATE=true creates the tables)
  4. First account:    npm run account:create
     Health check:     http://localhost:8000/api/v1/health
     Swagger UI:       http://localhost:8000/api/docs
`);
