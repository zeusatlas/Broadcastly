# AGENTS.md — Broadcastly (api)

Binding rules for every agent and developer working in this repository.
Read this fully before the first edit. These rules are not suggestions.

Product requirements: `../docs/Constituency_Communication_Platform_SRS_v1.0.docx`.
Requirement IDs (FR-\*, NFR-\*, BR-\*) refer to that document. The mobile app's
rules are in `../mobile-ui/AGENTS.md`; the two share one wire contract (§6).

---

## 1. What this service is

The API behind the executive mobile app: organisational structure and
appointments, member directory and imports, SMS broadcasts with approvals,
credits and a ledger, delivery reports, notifications and audit.

The data includes political affiliation — sensitive personal data under
Ghana's Data Protection Act, 2012 (Act 843). **This server is the access
control.** The app only hides buttons; every rule is enforced here (FR-IAM-05).

---

## 2. Non-negotiable rules

1. **Never invent product behaviour.** If the SRS does not specify it, ask.
   A stub with a description beats a guessed feature.
2. **Every protected route runs `authenticate` then `authorize`.** No route
   reads or writes member, broadcast, credit or appointment data without both.
3. **Scope the query, not the response.** Filter by the caller's
   `scopeUnitIds` inside the SQL. Never load a broad set and filter in JS (FR-IAM-03).
4. **Money and messages are idempotent.** Dispatch, credit movement and every
   job must be safe to run twice (FR-SMS-14, NFR-REL-03, BR-13).
5. **Credits move only through `ledger_service.ts`**, inside one DB transaction
   with row locks, with a ledger row for every change (BR-11).
6. **Schema changes only through migrations.** `synchronize` stays `false`.
7. **No secrets in code or git.** Config comes from the environment, validated
   in `config/env.ts` (NFR-SEC-02).
8. **`npm run typecheck`, `npm run lint` and `npm test` are clean** before any
   work is called done.

---

## 3. Stack

| Concern         | Choice                                       | Notes                                   |
| --------------- | -------------------------------------------- | --------------------------------------- |
| Runtime         | Node.js ≥ 24.11, TypeScript 6.0, CommonJS    | TS 7 waits for typescript-eslint        |
| HTTP            | Express 5                                    | Async errors reach the error handler natively — no try/catch wrappers |
| Database        | **PostgreSQL 17** + **TypeORM 1.x**          | See §8                                  |
| Validation      | Zod 4                                        | Same schemas generate the OpenAPI docs  |
| Jobs            | BullMQ 6 on Redis (ioredis)                  | Separate worker process                 |
| Auth            | JWT access tokens (jsonwebtoken, HS256)      | Refresh sessions stored server-side     |
| Logging         | pino + pino-http                             | Redacted; see §9                        |
| Docs            | zod-to-openapi + swagger-ui-express          | `/api/docs`, `/api/docs.json`           |
| Tests           | Vitest + Supertest                           |                                         |

**Dependency policy:** same as the frontend — needed now, maintained (release
in the last ~6 months), widely used, typed, commercial-friendly licence, not a
duplicate of something we have (hashing and sign-in codes use Node's built-in `crypto`).
Not installed on purpose until needed:
`multer` and a spreadsheet parser (with
imports — `xlsx` on npm and `exceljs` are unmaintained; choose deliberately).

---

## 4. Naming conventions

| Thing                   | Convention                  | Example                         |
| ----------------------- | --------------------------- | ------------------------------- |
| Files                   | `snake_case.ts`             | `ledger_service.ts`             |
| Module layer files      | `<module>_<layer>.ts`       | `broadcasts_service.ts`         |
| Entity files            | `entities/<name>_entity.ts` | `entities/wallet_entity.ts`     |
| Job files               | `jobs/<name>_job.ts`        | `jobs/sms_dispatch_job.ts`      |
| Entity classes          | `PascalCase`, singular      | `CreditTransaction`             |
| Tables and columns      | `snake_case`                | `credit_transactions.created_at` |
| Request body / query    | `<Action><Thing>Request`    | `CreateMemberRequest`           |
| Response `data` payload | `<Thing>Response`           | `MemberResponse`                |
| Zod schemas             | `<camelCase>Schema`         | `createMemberSchema`            |
| Constants               | `SCREAMING_SNAKE_CASE`      | `MAX_PAGE_SIZE`                 |
| Routes                  | plural, kebab-case          | `/api/v1/member-imports/:id`    |

### Domain naming — use the party's words (SRS §1.4)

| Name          | Means                                                                 | Never call it      |
| ------------- | --------------------------------------------------------------------- | ------------------ |
| `Member`      | Any party member on record (`members`). Most only receive SMS.        | person, user, people |
| `partyId`     | The party membership number (`party_id`), the key to look members up. | memberId, member number |
| `memberId`    | A member's own uuid, and every FK to `members` (`member_id`).         | personId           |
| `Executive`   | An appointed member's login (`executives`): email, role, status.      | account, user      |
| `Appointment` | A member holding a position in a unit for a period.                   | role assignment    |
| Units         | constituency → electoral area / branch → polling station.             | region, ward       |

"Account" is fine in user-facing text ("This account is not active"); in code it is `Executive`.
Coming next on `members`' side: `memberships` (member ↔ polling station, source, consent, FR-MEM-09).

### Field casing — database snake_case, API camelCase

The database is `snake_case`; everything the API sends or receives is `camelCase`.
Entities carry camelCase properties with an explicit snake_case column name, and a mapper
(`<module>_mapper.ts`, e.g. `toUserResponse`) builds the response. Entities never leave a service.

```ts
@Column({ type: 'varchar', length: 50, name: 'party_id', nullable: true })
partyId: string | null;           // DB party_id  →  API partyId
```

| Database          | API / app        |
| ----------------- | ---------------- |
| `id` (uuid)       | `id`             |
| `first_name`      | `firstName`      |
| `middle_name`     | `middleName`     |
| `last_name`       | `lastName`       |
| `party_id`        | `partyId`        |
| `created_at`      | `createdAt`      |
| `updated_at`      | `updatedAt`      |

Tokens are `tokens: { accessToken, refreshToken, tokenType, expiresIn }`.
Every primary key is a UUID named `id` (from `BaseEntity`); nothing exposes sequential ids.

**`interface` for every object shape** (lint-enforced). `type` only for unions
and derived types. Request and response names match the app's, so one name
means one shape on both sides.

Zod schemas are checked against their interface, so the two cannot drift:

```ts
export const createMemberSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string(),
  unitId: z.uuid(),
}) satisfies z.ZodType<CreateMemberRequest>;
```

---

## 5. Project structure

Domain-driven: one module per business area, mirroring the app's `features/`.

```
src/
├── server.ts               API entry: connect DB + Redis, listen, graceful shutdown.
├── worker.ts               Job worker entry. Separate process from the API.
├── app.ts                  Express app: middleware order lives here only.
├── routes.ts               Mounts each module's router under /api/v1. One line each.
├── config/                 env (validated), logger, database, redis, openapi.
├── common/                 Shared, no domain knowledge.
│   ├── http/               ApiResponse/ErrorResponse, sendSuccess, pagination.
│   ├── errors/             AppError and its subclasses.
│   └── middleware/         validate, error_handler, rate_limit, request_id, not_found, idempotency.
├── database/               BaseEntity, initialize_database (auto-create + auto-migrate), migrations/.
├── cli/                    Terminal commands: create_executive.ts (`executive:create`), seed.ts (`seed`, dev data).
├── jobs/queues.ts          Queue names, default retry policy, getQueue().
├── integrations/           External provider boundaries: sms/, payments/, email/ (SRS 6.4–6.6).
├── modules/
│   ├── health/             Fully implemented — the reference module.
│   ├── auth/               Sign-in, sessions, access control. Complete — the reference module.
│   ├── organisation/       Units, positions, appointments, grants (§4.2–4.3). Tables + access query done.
│   ├── members/            Members (every party member), memberships, suppression, imports (§4.4)
│   ├── broadcasts/         Drafts, templates, recipients, segments, dispatch (§4.5)
│   ├── approvals/          Approval rules and decisions (§4.6)
│   ├── credits/            Wallets, ledger, reservations, purchases (§4.7)
│   ├── reports/            History, delivery reports, exports (§4.8)
│   ├── notifications/      In-app and email (§4.9)
│   ├── audit/              Append-only audit log (NFR-SEC-05). Done; a DB trigger blocks UPDATE/DELETE.
│   └── platform/           Platform administration (§4.10)
└── types/express.d.ts      req.auth.
```

### Anatomy of a module

```
modules/members/
├── members_routes.ts       Router + OpenAPI registration. Declares the middleware chain.
├── members_controller.ts   HTTP only: validated input → service → sendSuccess.
├── members_service.ts      Business rules, transactions, scope. Takes AccessContext.
├── members_repository.ts   TypeORM queries. Scope filter in every query.
├── members_schemas.ts      Zod request schemas (satisfies the Request interfaces).
├── members_types.ts        …Request / …Response interfaces, plus `as const` enums.
├── members_mapper.ts       Entity → …Response (camelCase). The only way data leaves the module.
├── entities/               TypeORM entities owned by this module.
├── jobs/                   Worker factories for this module's queues.
└── index.ts                Public API. Other modules import only this (lint-enforced).
```

Request flow: `route → authenticate → authorize → validate → controller →
service → repository → database`.

Rules:

- Controllers never touch the database. Services never touch `req`/`res`.
- A module never imports another module's internals — only its `index.ts`.
- Cross-module writes go through the other module's service (e.g. broadcasts
  call `credits` to reserve, `audit` to record), never its repository.
- Stub files hold one or two lines describing their purpose, then `export {};`.
  Replace the whole file when you implement it.
- Reuse the shared helpers instead of re-writing them: `common/http/openapi_schemas.ts`
  (`successEnvelope`, `jsonBody`, `jsonResponse`, `errorResponses`, `messageEnvelope`),
  `common/http/request_context.ts` (`getRequestContext(req)` for audit data),
  `auditService.record(event, manager)` and `validated<T>(res, part)`.
- Repository functions take an optional `EntityManager` so a service can run several in one
  `dataSource.transaction(...)`.

---

## 6. The wire contract

Defined in `common/http/api_response.ts`, mirrored in
`mobile-ui/src/types/api/api_response.ts`. **Change both together.**

```jsonc
// success — sendSuccess() / sendCreated() / sendNoData()
{ "status": "success", "status_code": 200, "message": "Member created.", "data": { … } }

// error — thrown AppError → error_handler
{ "status": "error", "status_code": 422, "message": "Some details need fixing.",
  "errors": { "phone": ["Enter a valid Ghanaian number."] } }
```

- Controllers respond only through `sendSuccess` / `sendCreated` / `sendNoData`.
  Endpoints with no payload omit `data`.
- Services signal failure by throwing an `AppError` subclass
  (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`, …).
  Never `res.status(…).json(…)` by hand.
- `message` is shown to the user verbatim. Plain language, no internals.
- Unknown errors become a generic 500. DB text and stack traces never leave
  the server; they are logged with the request id.
- Lists return `Paginated<T>` (`items, page, pageSize, total, hasNextPage`) and
  validate their query with `pageQuerySchema` (max 100 per page).
- All routes live under `/api/v1`.

---

## 7. Authentication and access control

**Endpoints** (`modules/auth/auth_routes.ts`, all under `/api/v1/auth`):

| Method | Path               | Auth   | Body                               | `data`                  |
| ------ | ------------------ | ------ | ---------------------------------- | ----------------------- |
| POST   | `/login`           | public | `{ email, phone }`                 | `OtpChallengeResponse`  |
| POST   | `/verify-otp`      | public | `{ challengeId, code }`            | `{ user, tokens }`      |
| POST   | `/resend-otp`      | public | `{ challengeId }`                  | `OtpChallengeResponse`  |
| POST   | `/refresh`         | public | `{ refreshToken }`                 | `tokens`                |
| POST   | `/logout`          | bearer | `{ allDevices? }` (body optional)  | —                       |
| GET    | `/me`              | bearer | —                                  | `user` (`UserResponse`) |

**Model.** `members` (one per party member: names, `party_id`, `phone` in E.164, `date_of_birth`) ←
`executives` (an appointed member's login: email, `role`, `status`; **no password**) ← `sessions`.
Sign-in uses `otp_challenges` (one per sign-in: account, masked phone) ← `otp_codes` (one per SMS
sent: code HMAC, expiry, tries; a resend supersedes the previous code). Access comes from
`appointments` (member + position + unit + dates) and `permission_grants` (per appointment).

**Sign-in is email + phone + SMS code (owner's decision; there are no passwords).**
- Email and phone identify; the 6-digit SMS code proves. Phones are normalised to `+233…` by
  `normaliseGhanaPhone` (members module), so `024…`, `+233 24…` etc. all match.
- Wrong email, unknown email and phone mismatch all return `401 Invalid email or phone number.`
  (owner's rule: never say which part is wrong or that an email has no account). A phone mismatch
  on a real email counts towards that account's lockout. Status (locked / inactive) is shown only
  once both match.
- Codes: `crypto.randomInt`, HMAC-SHA256 keyed from `JWT_ACCESS_SECRET` and bound to the code's id;
  expire after **3 min**, 5 tries per code, resend after 60 s (also after expiry), resends allowed
  for 15 min per challenge, at most 5 SMS per account per 15 min. Constants in `otp_service.ts`.
- Only the newest code of a challenge works. Wrong codes count towards the 15-minute lockout.
- An unknown, finished or over-15-minute challenge returns **404** (not 401) from verify and resend,
  so the app can tell "start again" apart from "wrong code" (401).
- Messages are short and fixed (constants at the top of `auth_service.ts`); keep them that way.
- SMS goes through `integrations/sms/transactional_sms.ts` after the transaction commits, not
  awaited. `SMS_DRIVER=log` prints the code to the console and is refused in production.

**Roles and permissions (BR-01).**
- `role` (`UserRole`: platform_admin, constituency_chairman, constituency_executive,
  area_executive, polling_station_executive) is stored on the account.
- Permissions = `ROLE_DEFAULT_PERMISSIONS[role]` (chairman: all; others: none) **only while the
  member has an active appointment**, plus grants on their active appointments.
- Scope = units of active appointments + all descendants (recursive CTE in
  `organisation_repository.ts`). Platform admins have no member-data scope.
- `authorize(rule)` takes `{ permission, anyOf, allOf, roles }`, same as the app. Prefer permissions.
- Scope is enforced in services and repositories with `req.auth.scopeUnitIds`, never in middleware.

```ts
membersRouter.post(
  '/',
  authenticate,
  authorize({ permission: 'member.manage' }),
  validate({ body: createMemberSchema }),
  membersController.create,
);
```

**Tokens and sessions.**
- Access token: JWT HS256, 15 min, claims only `sub` (account id) and `sid` (session id);
  algorithm, issuer and audience pinned on verify.
- `authenticate` → `resolveAccess()` reloads session, account status, permissions and scope
  from the DB on **every** request, so suspension or a revoked appointment applies at once (BR-05).
- Refresh token: opaque `<sessionId>.<256-bit secret>`; only its SHA-256 is stored. Rotated on
  every refresh; presenting an old one revokes the session (theft detection). Absolute expiry
  `SESSION_TTL_HOURS` (24) after sign-in; refreshing never extends it. Tokens carry
  `sessionExpiresAt`, so the app can end a dead session on launch without a network call.
- The lockout counter is one atomic SQL UPDATE; auth routes also share the per-IP
  `authRateLimit` (10 per 15 min).
- Every code sent, sign-in, failure, lockout, sign-out, token reuse and account creation is
  written to `audit_events`. Never put the phone number or code in audit metadata.

**Not built yet (needs a decision or another module first):** a real SMS gateway driver (SRS 6.4),
invitations, account administration endpoints (create, suspend, activate — will sit with
appointments, UC-02). Executives are created with `npm run executive:create` (email, phone, date of birth).

## 8. Database — TypeORM 1.x

**TypeORM 1.0 removed much of 0.3.** Do not copy patterns from older projects
(including ZFund): no global `getRepository()`, no `Connection`, no
`findOneById`/`findByIds`, no `@EntityRepository`, no `TYPEORM_*` env config.

- Use `dataSource.getRepository(Entity)` or `dataSource.transaction(async (m) => …)`.
- Every entity extends `BaseEntity` (UUID id, `created_at`, `updated_at`).
- **Give every `@Column` an explicit `type`.** The dev runner and tests use
  esbuild, which emits no decorator metadata, so TypeORM cannot infer types.
- Name tables and columns explicitly in `snake_case`.
- `null`/`undefined` in a `where` now throws. Use `IsNull()`.
- Money and credit amounts: `numeric` or integer minor units, never `float`.
- History is never deleted: appointments, ledger rows, audit events,
  broadcasts (FR-ORG-07, BR-11). Use status fields and effective dates.
- Migrations: `npm run migration:generate -- src/database/migrations/<Name>`,
  review the SQL, commit it, `npm run migration:run`. Hand-written SQL (triggers, things TypeORM
  cannot express) goes in the same migration with a one-line comment.
- Database name is `broadcastly` (`DB_NAME`). Each developer puts their own connection details
  in `.env`. With `DB_AUTO_CREATE=true` the API creates the database on boot if it is missing
  (needs CREATEDB); with `DB_AUTO_MIGRATE=true` it applies pending migrations. Both stay
  `false` in production, where the deploy creates and migrates the database.
- `@OneToOne` + `@JoinColumn` already adds a unique constraint; do not also set `unique: true`.

### Data access and performance (owner's rule: fetch only what is needed)

- **Select only the columns the caller uses.** No `relations` or joins for data the response
  does not return; use `select: {…}` or a lean raw query (see `findSessionForAccess`,
  `findExecutiveStatus`). Never `SELECT *` in raw SQL.
- **Count round trips on hot paths.** `authenticate` runs on every request: it is exactly two
  queries (live session + executive state, then permissions + scope in one statement). Keep it so.
- **Combine instead of looping.** One statement with CTEs / `json_agg` beats N small queries;
  never query inside a loop (no N+1). Independent queries run in `Promise.all`.
- **Opt in to costly parts** (`getActiveAccess(memberId, { scope, appointments })`): compute
  scope only to authorise, appointments only to show a profile.
- **Reuse what a transaction already loaded** instead of fetching it again afterwards.
- **Paginate every list** (`pageQuerySchema`, max 100) and index every column used in a
  `WHERE`, `JOIN` or `ORDER BY` of a hot query (e.g. `otp_codes (challenge_id, created_at)`).
- **No caching of access decisions**: permissions must change on the next request (BR-05).
- The pool sets `statement_timeout` 15 s and `idle_in_transaction_session_timeout` 30 s; long
  jobs raise it with `SET LOCAL statement_timeout` inside their own transaction.
- Parameters only (`$1`, `:name`) — never interpolate user input into SQL. Interpolating a code
  constant (like the ISO format in `organisation_repository.ts`) is the only exception.

---

### Startup messages

`server.ts` and `worker.ts` log each boot step in plain language: starting → database
connected (created / migrations applied / pending) → Redis connected → `API ready: <url>` and
docs URL. Every boot step runs inside `startupStep(service, fn)` (`config/startup.ts`), which turns
known failures (wrong password, service down, missing database, port in use, missing privilege)
into one sentence that says what to fix; unknown failures also print the stack. Add a hint to
`HINTS` there when a new failure mode appears. An invalid `.env` is reported by `config/env.ts`
before the logger exists. Redis outages after boot are logged once, not on every retry.

---

## 9. Security and privacy

- Transport is HTTPS-only at the proxy (NFR-SEC-01); `trust proxy` is set to 1.
- `helmet`, a CORS allowlist from `CORS_ORIGINS`, 100 kB JSON limit, global rate limit.
- **Never log** phone numbers, names, message bodies, tokens or request bodies.
  Use `logger` from `config/logger.ts` (`console` is a lint error). Redaction
  is a safety net, not permission.
- Provider and payment webhooks verify their signature before doing anything,
  and payment confirmation is verified server-side before credits are added (SRS 6.5).
- Uploaded spreadsheets are processed and then deleted; never committed or
  served back.
- Audit every sensitive action through the `audit` module (NFR-SEC-05):
  appointment and permission changes, credit movements, approvals, account
  status changes, sign-in events.

---

## 10. Background jobs

- Queues are declared in `jobs/queues.ts`. Enqueue with `getQueue(name).add(…)`.
- Workers live in `modules/<module>/jobs/` and are registered in `worker.ts`.
- Default policy: 5 attempts, exponential backoff, failed jobs kept for review.
- **Every job is idempotent.** SMS dispatch records a per-recipient state and
  skips recipients already submitted, so a retry never double-sends (BR-13).
- Long work (imports, dispatch, exports, email) is always a job; the HTTP
  request returns immediately with an id the app polls (NFR-PERF-01).
- Send rate respects the provider's limit (NFR-PERF-02) — use BullMQ's limiter.

---

## 11. API documentation

Register every route with `openApiRegistry.registerPath` in its
`<module>_routes.ts`, using the same Zod schemas that validate it.
`/api/docs` must always match the implementation (NFR-MAINT-02). See
`modules/auth/auth_routes.ts` for the full pattern.

- Swagger UI (`config/api_docs.ts`) has two definitions in its top-right dropdown:
  **API overview** (default landing page, no endpoints, text in `config/api_docs_content.ts`)
  and **v1** (all endpoints). JSON: `/api/docs/overview.json`, `/api/docs/v1.json`,
  and `/api/docs.json` (alias of v1 for tools). Title is "Broadcastly API".
- Every operation has `operationId`, a short `summary` (verb first, e.g. "Sign in") and a
  **short, plain** `description`: one sentence saying what it does, then at most 2–3 bullets
  with what a developer must know (limits, side effects). No long sections. The explanation
  lives on the endpoint, not on fields. See `modules/auth/auth_routes.ts`.
- **No `description` on schema fields** (request or response). Fields get an `example` only, so
  the sample payloads look real.
- Every request body has a full example. Responses use `successEnvelope(schema, message)`,
  `messageEnvelope(message)` and `errorResponses(401, [403, 'when this happens', 'message'], 422)`
  from `common/http/openapi_schemas.ts`; give each error code an endpoint-specific explanation.
- New module → add its tag and one-line description to `TAG_DESCRIPTIONS`.
- Examples use neutral, made-up data: never real party names, places or people.
- The landing page is presentation, not security: the spec is public whenever
  `API_DOCS_ENABLED=true`. Keep it `false` in production unless the docs are restricted.

---

## 12. Working agreement (how the owner wants work done)

- Industry standard, security-first, senior-engineer quality: clean structure, small reusable
  pieces, no duplication, no speculative abstractions.
- **Do not guess.** Check a library's real API in `node_modules` (types or source) before using
  it, and the SRS before inventing behaviour. State assumptions plainly in the summary.
- **Be efficient.** Read what you need, verify by running, don't narrate.
- **Comments:** only where the *why* is not obvious. At most two lines each, written so a
  colleague new to the code understands it. No comments that restate the code.

  ```ts
  // Single atomic UPDATE, so parallel wrong guesses cannot race past the lockout threshold.
  ```
- Keep this file current: when a convention or decision changes, update it in the same change.
- Verify DB work against a real PostgreSQL before calling it done; typecheck alone is not enough.

## 13. Definition of done

- [ ] `npm run typecheck`, `npm run lint`, `npm test` clean
- [ ] Protected routes have `authenticate` + `authorize`; queries are scoped
- [ ] Inputs validated with Zod; Zod schema `satisfies` its Request interface
- [ ] Responses only via `sendSuccess`/`sendCreated`/`sendNoData`; failures via `AppError`
- [ ] Route registered in OpenAPI
- [ ] Schema changes have a reviewed migration
- [ ] Sensitive actions audited; nothing personal logged
- [ ] Jobs and money/message writes are idempotent
- [ ] Anything unverified is stated plainly, not implied as working
