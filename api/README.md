# Broadcastly — Backend API

Node.js 24 · Express 5 · TypeScript · **PostgreSQL 17** (TypeORM 1.x) · Redis (BullMQ) · Zod · OpenAPI.

**Read [`AGENTS.md`](./AGENTS.md) before your first commit.** Requirements live
in `../docs/Constituency_Communication_Platform_SRS_v1.0.docx`.

---

## Prerequisites

| Tool                 | Version   | Why                                                       |
| -------------------- | --------- | --------------------------------------------------------- |
| Node.js              | ≥ 24.11   | Runtime (`node -v`)                                       |
| Docker Desktop       | any recent | Runs Redis — and PostgreSQL too, if you choose option B  |
| PostgreSQL           | **17**    | Option A only: a local install, viewed with pgAdmin       |
| pgAdmin (optional)   | any       | Browse tables and data                                    |

Docker Desktop must be **running** (whale icon in the tray) before any
`services:` command.

---

## First-time setup

### 1. Install and create `.env`

```bash
cd api
npm install
npm run setup        # creates .env from .env.example with a fresh JWT secret
```

### 2. Database — choose one

Put your own PostgreSQL connection details in `.env` (`DB_HOST`, `DB_PORT`, `DB_USERNAME`,
`DB_PASSWORD`, `DB_NAME` — default `broadcastly`). Then:

**Option A0 — let the API create it (quickest).** Keep `DB_AUTO_CREATE=true` and
`DB_AUTO_MIGRATE=true` (the `.env.example` defaults). On `npm run dev` the API creates the
database if it is missing and applies migrations. `DB_USERNAME` needs the `CREATEDB` privilege
(the `postgres` superuser has it). Never enable these in production.

**Option A — create it yourself in pgAdmin** (app gets its own least-privilege login)

1. In pgAdmin, connect to your server as `postgres`, open the `postgres`
   database → **Tools → Query Tool**, paste [`scripts/create_database.sql`](./scripts/create_database.sql)
   and run it (F5). It creates the `broadcastly` login and the
   `broadcastly` database.
2. Find your server's port: pgAdmin → right-click the server → **Properties →
   Connection → Port** (usually `5432`; `5433` if another PostgreSQL version
   was installed first).
3. Put the same values in `.env`:

   ```env
   DB_HOST=localhost
   DB_PORT=5432          # the port from step 2
   DB_USERNAME=broadcastly
   DB_PASSWORD=broadcastly
   DB_NAME=broadcastly
   ```

**Option B — PostgreSQL 17 in Docker** (nothing to install)

```bash
npm run services:up       # PostgreSQL 17 + Redis
```

and set `DB_PORT=55432` in `.env`. To browse it in pgAdmin, register a server
with host `localhost`, port `55432`, user and password `broadcastly`.

### 3. Redis

```bash
npm run services:up       # Redis (6380) + PostgreSQL (55432) in Docker
```

### 4. Create the tables, then start

```bash
npm run migration:run     # skip if DB_AUTO_MIGRATE=true — the API applies them on boot
npm run dev               # API on http://localhost:8000, reloads on save
npm run dev:worker        # background jobs — second terminal, once jobs exist
```

### 5. Create the first account

```bash
npm run seed              # dev platform admin + a constituency with its chairman
```

| Who            | App    | Email                       | Phone        |
| -------------- | ------ | --------------------------- | ------------ |
| Platform admin | web    | `admin.test@example.com`    | `0201234567` |
| Chairman       | mobile | `chairman.test@example.com` | `0241234567` |

The sign-in code is printed in the API log (`SMS_DRIVER=log`). Safe to re-run; refuses to run in
production. From there the platform admin creates constituencies and chairmen through
`/api/v1/platform` (see `AGENTS.md` §7a).

On a new server with no admin yet, create the first one with `npm run executive:create` and pick
`platform_admin`.

### 6. Check it works

- Health check: <http://localhost:8000/api/v1/health> — `database` and `redis` must both be `"up"`.
- Swagger UI: <http://localhost:8000/api/docs> (when `API_DOCS_ENABLED=true`). It opens on the
  **API overview**; choose **v1** in *Select a definition* (top right) to see the endpoints.
- Raw OpenAPI: <http://localhost:8000/api/docs.json>.

---

## Every day after that

```bash
npm run services:up       # Redis + PostgreSQL in Docker
npm run dev
```

---

## Troubleshooting

On start the API prints each step — database connected, schema up to date, Redis connected,
`API ready: http://localhost:8000/api/v1`. If a step fails it stops with one line saying what
is wrong and what to change, for example:

```
FATAL: API failed to start: PostgreSQL rejected the login for user "postgres". Check DB_USERNAME and DB_PASSWORD in .env.
```

| Symptom                                                 | Cause and fix |
| ------------------------------------------------------- | ------------- |
| `FATAL: API failed to start` … `password authentication failed for user "broadcastly"` | The role does not exist on the server at `DB_PORT`, or another PostgreSQL is answering there. Run `scripts/create_database.sql` on the right server, and check `DB_PORT` matches pgAdmin. `netstat -ano \| findstr :5432` shows who owns a port. |
| `ECONNREFUSED ... 6380`                                 | Redis is not running: `npm run services:up`. |
| `open //./pipe/dockerDesktopLinuxEngine` …              | Docker Desktop is not running. Start it and wait until it says *running*. |
| `Invalid environment configuration:` + a variable name  | That `.env` value is missing or wrong. Compare with `.env.example`. |
| `Missing script: "service:up"`                          | Typo — it is `services:up` (plural). `npm run` lists every script. |
| Phone (Expo Go) cannot reach the API                    | A phone cannot reach `localhost`. Set the app's `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g. `http://192.168.1.20:8000/api/v1`. |

---

## Scripts

| Command                                       | Purpose                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `npm run setup`                               | First run: create `.env` with a fresh secret    |
| `npm run seed`                                | Dev data: platform admin, constituency, chairman |
| `npm run executive:create`                    | Create an executive account from the terminal   |
| `npm run dev` / `dev:worker`                  | API / worker with reload (tsx)                  |
| `npm run services:up`                         | Redis + PostgreSQL 17 in Docker                 |
| `npm run services:down`                       | Stop Docker services (data is kept)             |
| `npm run migration:generate -- src/database/migrations/<Name>` | Diff entities → new migration |
| `npm run migration:run` / `migration:revert`  | Apply / roll back migrations                    |
| `npm run build` / `npm start` / `start:worker` | Compile to `dist/` / run compiled API / worker |
| `npm run typecheck` · `lint` · `format` · `test` | Checks — all must pass before a PR          |

---

## Environment variables

Every variable is validated at startup (`src/config/env.ts`); a missing or bad
value stops the API and names the variable. See `.env.example` for comments.

| Variable              | Example                     | Notes                                      |
| --------------------- | --------------------------- | ------------------------------------------ |
| `PORT`                | `8000`                      | API port                                   |
| `DB_HOST` · `DB_PORT` | `localhost` · `5432`        | PostgreSQL 17 — same as pgAdmin            |
| `DB_USERNAME` · `DB_PASSWORD` · `DB_NAME` | `broadcastly` · … | The app's own login, never `postgres` |
| `DB_SSL`              | `false`                     | `true` for managed/cloud databases         |
| `DB_AUTO_CREATE`      | `true`                      | Create `DB_NAME` on boot if missing (dev)  |
| `DB_AUTO_MIGRATE`     | `true`                      | Apply pending migrations on boot (dev)     |
| `REDIS_URL`           | `redis://localhost:6380`    |                                            |
| `JWT_ACCESS_SECRET`   | 64 random chars             | Generated by `npm run setup`               |
| `JWT_ACCESS_TTL`      | `15m`                       | Access token lifetime                      |
| `SESSION_TTL_HOURS`      | `24`                     | Session lifetime from sign-in (fixed)      |
| `CORS_ORIGINS`        | `http://localhost:8081`     | Browser origins only; the app needs none   |
| `API_DOCS_ENABLED`    | `true`                      | `false` in production unless restricted    |

---

## Structure

```
src/
├── server.ts · worker.ts · app.ts · routes.ts
├── config/        env · logger · database · redis · openapi
├── common/        http/ (envelope, pagination) · errors/ · middleware/
├── database/      BaseEntity · migrations/
├── jobs/          queues
├── integrations/  sms · payments · email (provider boundaries)
└── modules/       health · auth · organisation · members · broadcasts · approvals
                   credits · reports · notifications · audit · platform
scripts/           setup.mjs · create_database.sql
```

`modules/health/` is the smallest complete module; `modules/auth/` is the full reference
(routes → controller → service → repository, schemas, OpenAPI, audit). Implemented: auth,
audit, and the organisation tables and access query that auth depends on. Every other module
is stubs — each file states what belongs in it.

## Auth endpoints

| Method | Path                         | Auth   | Purpose                                             |
| ------ | ---------------------------- | ------ | --------------------------------------------------- |
| POST   | `/api/v1/auth/login`         | public | Email + phone → SMS code sent → `{ challengeId, maskedPhone, expiresIn, resendIn }` |
| POST   | `/api/v1/auth/verify-otp`    | public | `{ challengeId, code }` → `{ user, tokens }`        |
| POST   | `/api/v1/auth/resend-otp`    | public | `{ challengeId }` → new code (after 60 s)           |
| POST   | `/api/v1/auth/refresh`       | public | Rotate refresh token → new `tokens`                 |
| POST   | `/api/v1/auth/logout`        | bearer | End this session, or all with `{ allDevices: true }` |
| GET    | `/api/v1/auth/me`            | bearer | Current user, permissions and appointments          |

With `SMS_DRIVER=log` (development) no SMS is sent: the code appears in the API console as
`SMS to …4567 (not sent, SMS_DRIVER=log): 488113 is your … sign-in code`.

## Response contract

```jsonc
{ "status": "success", "status_code": 200, "message": "…", "data": { … } }
{ "status": "error",   "status_code": 422, "message": "…", "errors": { "field": ["…"] } }
```

Shared with the app — see AGENTS.md §6.

## Pending decisions (SRS 12.2)

- SMS provider and sender ID → `integrations/sms/`
- Payment provider and credit purchase policy → `integrations/payments/`, `modules/credits/`
- Approval matrix → `modules/approvals/`
- Party hierarchy and titles → `modules/organisation/`
- Spreadsheet parser for Excel imports (current npm options are unmaintained)
- Rate-limit store: add Redis-backed limits before running more than one API instance
