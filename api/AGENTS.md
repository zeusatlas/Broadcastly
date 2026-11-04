# AGENTS.md — Broadcastly (api)

Binding rules for every agent and developer working in this repository.
Read this fully before the first edit. These rules are not suggestions.

Product requirements: `../srs-docs/Constituency_Communication_Platform_SRS_v1.0.docx`.
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
`multer` (2.x) handles image uploads, wrapped once in `common/uploads/image_upload.ts`. Not installed on
purpose until needed: a spreadsheet parser (with imports — `xlsx` on npm and `exceljs` are
unmaintained; choose deliberately).

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
| `OrganisationExecutive` | A member promoted to executive in their organisation (`organisation_executives`): login email, status. | account, user |
| `Position`    | An office in an organisation, e.g. Constituency Organiser; the chairman creates them. | role, title |
| `Appointment` | A member holding a position in a unit for a period.                   | role assignment    |
| `Organisation`| A tenant: one constituency (or other organisation). Owns members, units, appointments. | tenant, party |
| Units         | Levels inside an organisation: electoral area / branch → polling station. | region, ward       |

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
├── cli/                    Terminal commands: seed.ts (`seed`, dev data through the real services: a
│                           platform admin and an organisation with its chairman), create_platform_admin.ts
│                           (`admin:create`, the first admin on a new server).
├── jobs/queues.ts          Queue names, default retry policy, getQueue().
├── integrations/           External provider boundaries: sms/, payments/, email/ (SRS 6.4–6.6).
├── modules/
│   ├── health/             Fully implemented — the reference module.
│   ├── auth/               Sign-in, sessions, access control. Complete — the reference module.
│   ├── organisation/       Data layer only (no routes): organisations, units, positions, appointments, grants.
│   ├── members/            Members (every party member), memberships, suppression, imports (§4.4)
│   ├── broadcasts/         The `broadcasts` table and its read shape so far; drafting and dispatch next (§4.5)
│   ├── approvals/          Approval rules and decisions (§4.6)
│   ├── credits/            Wallets, ledger, purchases (§7c); reservations and allocation next (§4.7)
│   ├── reports/            History, delivery reports, exports (§4.8)
│   ├── notifications/      In-app and email (§4.9)
│   ├── audit/              Append-only audit log (NFR-SEC-05). Done; a DB trigger blocks UPDATE/DELETE.
│   ├── chairman/           An organisation head's tools at /organisation: positions, units, executives (§7b).
│   └── platform/           Platform admin: organisations, chairmen, executives, admins (§7a). Done.
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
| POST   | `/login`           | public | `{ email, phone, client? }`        | `OtpChallengeResponse`  |
| POST   | `/verify-otp`      | public | `{ challengeId, code }`            | `{ user, tokens }`      |
| POST   | `/resend-otp`      | public | `{ challengeId }`                  | `OtpChallengeResponse`  |
| POST   | `/refresh`         | public | `{ refreshToken }`                 | `tokens`                |
| POST   | `/logout`          | bearer | `{ allDevices? }` (body optional)  | —                       |
| GET    | `/me`              | bearer | —                                  | `user` (`UserResponse`) |

**One login for everyone (owner's decision).** Executives and platform admins use the same
`/api/v1/auth` endpoints. `user.role` tells each app where to go: `platform_admin` → admin tools,
anything else → the executive dashboard. The **mobile app is for everyone**; the **web app is for
platform admins only**: it sends `client: "web"` and the server refuses everyone else with `403`
before any SMS is sent. Admin routes are admin-only regardless (`authorize({ roles: ['platform_admin'] })`).

**Model (owner's decision; table and column names are deliberate).**
- `organisations` — the tenants (a constituency or other organisation; `type`, default `constituency`).
- `members` — party members; `organisation_id` is required. `party_id` is unique **within** an
  organisation (`uq_members_organisation_party_id`).
- `organisation_executives` — a **member promoted to executive** in their organisation:
  `organisation_id`, `member_id`, login email, `status`; **no password**. A composite foreign key
  (`member_id`, `organisation_id`) → `members` guarantees the member belongs to that organisation.
- `positions` — offices. Built-in ones (Chairman, `CHAIRMAN_POSITION_ID`) have no organisation; the
  chairman creates the rest for their own organisation (titles unique per organisation, ignoring case).
- `platform_admins` — Broadcastly operators, **not party members**: names, email, phone, status.
  No `members` row, no organisation. An email belongs to one account across both tables
  (`authRepository.lockEmail`: an advisory lock plus a cross-table check).
- `organisation_units` — levels inside an organisation (`organisation_id`, `parent_id`).
- `appointments` — member + position + `organisation_id` + optional `unit_id` (null for
  organisation-wide offices such as chairman) + dates; `permission_grants` per appointment.
- `sessions` and `otp_challenges` belong to exactly one account (`executive_id` or
  `platform_admin_id`, enforced by a `CHECK`); `otp_codes` per SMS sent (code HMAC, expiry, tries).

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
  awaited. `SMS_DRIVER=log` prints the code to the console instead of sending it.
- **Testing stand-ins (owner's decision, 2026-11-03):** `SMS_DRIVER=log` and `PAYMENT_DRIVER=simulate`
  are allowed in every environment (production included) while the real providers are not connected.
  They no longer stop the server: `warnAboutTestDrivers()` (`config/startup.ts`) logs a warning at every
  start of the API and the worker. Once a real provider is connected, switch the driver and restore the
  production refusal. Until then, never let real users near it: codes appear in the logs and anyone can
  settle a purchase through the webhook.

**Roles and permissions (BR-01).**
- `UserRole` is derived, never stored: `platform_admin`, `chairman` (holds an active chairman
  appointment) or `executive`. An executive's actual offices are their positions (owner's decision).
- Permissions: an active chairman appointment brings all of them; everyone else gets the grants on
  their active appointments. Ending an appointment removes the access on the next request.
- Scope: an organisation-wide appointment covers every unit of that organisation; a unit
  appointment covers that unit and its descendants (`organisation_repository.ts`). `req.auth`
  also carries `organisationId`, so member queries filter by organisation.
- `authorize(rule)` takes `{ permission, anyOf, allOf, roles }`, same as the app. Prefer permissions.
- `authenticate` serves both kinds (`req.auth.kind`). Platform admins get `role: 'platform_admin'`,
  no permissions and no scope. `platform_routes.ts` applies `authenticate` +
  `authorize({ roles: ['platform_admin'] })` once with `router.use(…)`, so no admin route can be
  added unprotected.
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
- One sign-in engine in `auth_service.ts` for both kinds (`AccountKind`): the kind comes from the
  email, the challenge or the session row, never from the client.
- `authenticate` → `resolveAccess()` reloads session, account status, permissions and scope
  from the DB on **every** request, so suspension or a revoked appointment applies at once (BR-05).
- Refresh token: opaque `<sessionId>.<256-bit secret>`; only its SHA-256 is stored. Rotated on
  every refresh; presenting an old one revokes the session (theft detection). Absolute expiry
  `SESSION_TTL_HOURS` (24) after sign-in; refreshing never extends it. Tokens carry
  `sessionExpiresAt`, so the app can end a dead session on launch without a network call.
- The lockout counter is one atomic SQL UPDATE; auth routes also share the per-IP
  `authRateLimit` (10 per 15 min).
- Every code sent, sign-in, failure, lockout, sign-out, token reuse, account creation, suspension,
  reactivation, organisation creation and appointment is written to `audit_events`, with the actor
  in `actor_executive_id` or `actor_platform_admin_id`. Never put the phone number or code in audit metadata.

**Not built yet (needs a decision or another module first):** a real SMS gateway driver (SRS 6.4),
invitations, and chairmen managing their own executives (create, suspend — with appointments, UC-02).
Chairmen, executives and platform admins are managed through §7a. On a new server, create the first
platform admin with `npm run admin:create`.

## 7a. Platform administration (owner's decisions, 2026-11-02)

The platform admin is the **super admin**: not a party member; manages every organisation, every
executive and the other admins, on the web or the mobile app (admin tools only: no member data).
They create an organisation and appoint its chairman; the chairman manages their own people and
messages on mobile. All routes are under `/api/v1/platform` and need a platform admin session.

| Method | Path                                                  | Does                                            |
| ------ | ----------------------------------------------------- | ----------------------------------------------- |
| GET    | `/overview`                                           | Dashboard totals                                |
| GET    | `/organisations?search=`                              | List, each with chairman, member and executive counts |
| POST   | `/organisations`                                      | Create (`{ name, type? }`)                      |
| GET    | `/organisations/:organisationId`                      | One organisation                                |
| POST   | `/organisations/:organisationId/chairman`             | Promote a member to executive and appoint them chairman |
| GET    | `/organisations/:organisationId/executives?search=&status=` | That organisation's executives and their positions |
| GET    | `/organisations/:organisationId/executives/:executiveId` | One of them                                  |
| POST   | `/organisations/:organisationId/executives/:executiveId/suspend` · `/reactivate` | Suspension ends their sessions |
| GET    | `/admins` · POST `/admins`                            | List · add a platform admin (admins add admins) |
| POST   | `/admins/:platformAdminId/suspend` · `/reactivate`    | Another admin, never yourself (403)             |

- **Executives belong to an organisation** (owner's decision): the admin sees them inside it, never
  as one platform-wide list. An executive id used under another organisation is a 404.
- **Chairman office.** One built-in `positions` row at the fixed id `CHAIRMAN_POSITION_ID`. Code
  refers to it by id, never by title.
- **Guarantees in the database:** organisation names are unique ignoring case (`uq_organisations_name`,
  expression index with `synchronize: false`); at most one active chairman per organisation
  (`uq_appointments_active_chairman`). The service checks first for a friendly message and locks the
  organisation row; the index catches races.
- **Appointing is atomic:** member + executive + appointment + audit rows commit together. If
  `partyId` matches a member of that organisation, that member is promoted instead of created.
- **Status changes** are a no-op if already in that status; suspension revokes every session at
  once; an executive's `deactivated` status is final and cannot be changed here.
- **Organisation status (owner's decision, 2026-11-03).** `suspend` stops a whole organisation: every
  executive's session is revoked in the same transaction, and while it is suspended its executives
  count as suspended at sign-in, refresh and on every request (`EXECUTIVE_STATUS_SQL` in
  `auth_repository.ts`). Its data is kept; `reactivate` restores access (each executive's own status
  still applies). `inactive` is reserved and cannot be changed here.
- **Admin reach (owner's decision).** The platform admin reads everything about an organisation and acts on
  status only: no sending broadcasts or moving credits on its behalf.

More platform routes (all need a platform admin session; lists are newest first and take `period`):

| Method | Path | Does |
| --- | --- | --- |
| POST | `/organisations/:organisationId/suspend` · `/reactivate` | See above |
| POST · DELETE | `/organisations/:organisationId/logo` | Upload (`multipart/form-data`, field `logo`) · remove |
| GET | `/broadcasts?organisationId=&status=&search=` · `/organisations/:id/broadcasts` | Broadcasts |
| GET | `/purchases?organisationId=&status=` · `/organisations/:id/purchases` | Credit purchases (`pending` / `completed` / `failed`) |
| GET | `/purchases/summary` | Credits bought, amount paid, pending and failed counts |
| GET | `/organisations/:organisationId/credit-transactions` | The organisation wallet's ledger |

- **Periods** (`common/http/period.ts`): `today`, `yesterday`, `last_3_days`, `last_7_days`,
  `last_30_days`, `last_365_days`, `all_time` (default), or `custom` with `from`/`to` (YYYY-MM-DD,
  inclusive). Rolling windows end now; days are UTC, which is Ghana time.
- **Responses:** organisations carry `logoUrl` and `credits { balance, reserved, available }`, executives
  `creditBalance`, and the overview `suspendedOrganisations` plus all-time purchase totals.
- Not built yet: replacing a chairman, renaming or deactivating an organisation, units, wiring the mobile admin screens.

## 7b. Chairman tools (owner's decisions, 2026-11-02)

The head of an organisation sets up its structure and people on the mobile app. Module `chairman`,
mounted at `/api/v1/organisation`. It exists because `auth` depends on `organisation` (access), so
`organisation` cannot hold routes that depend on `auth`: it stays the data layer.

| Method | Path                                         | Who                  | Does                                     |
| ------ | -------------------------------------------- | -------------------- | ---------------------------------------- |
| GET    | `/overview`                                  | `appointment.manage` | Home counts in reach: executives, positions, units by type; `members` only if organisation-wide |
| GET    | `/positions`                                 | `appointment.manage` | Built-in Chairman + this organisation's positions |
| POST   | `/positions` · PATCH `/positions/:positionId` | chairman            | Create · rename or retire (`isActive`)   |
| GET    | `/units?parentId=&search=`                   | `appointment.manage` | Browse one level at a time, within reach |
| POST   | `/units`                                     | chairman             | Create under an optional parent          |
| GET    | `/executives?search=&status=` · `/executives/:executiveId` | `appointment.manage` | Executives you manage, with positions and permissions |
| POST   | `/executives`                                | `appointment.manage` | Promote a member to executive + appoint  |
| POST   | `/executives/:executiveId/appointments`      | `appointment.manage` | Another position for an executive        |
| POST   | `/appointments/:appointmentId/end`           | `appointment.manage` | End it; its permissions are revoked      |
| POST   | `/executives/:executiveId/suspend` · `/reactivate` | `appointment.manage` | Ends / restores their sign-in      |

Rules, all enforced in `chairman_service.ts` (owner's decision: chairman + granted managers):
- **Reach.** Organisation-wide callers (an appointment with no unit) reach everything; others only
  their units and descendants (`scopeUnitIds`). Lists filter by reach in SQL.
- **Position fits place.** `unitType` `organisation` → no unit; otherwise a unit of that exact type.
- **Grants.** You can only grant permissions you hold. Ending an appointment revokes its grants.
- **Hands off.** Only a platform admin appoints or changes the chairman; nobody changes themselves.
- **Database:** unit names unique among siblings (`uq_organisation_units_sibling_name`); one active
  holding of a position per place (`uq_appointments_active_holding`).
- **Logo.** The chairman can `POST` / `DELETE /organisation/logo` (same rules as the admin's). Everyone in
  the organisation sees it as `organisation.logoUrl` on `/auth/me`.

## 7c. Credits and logos (owner's decisions, 2026-11-03)

Module `credits`, mounted at `/api/v1/credits`.

| Method | Path | Who | Does |
| --- | --- | --- | --- |
| GET | `/balance` | any executive | Own wallet, plus the organisation's if you hold `credit.purchase` or `credit.allocate` |
| GET | `/transactions?wallet=mine\|organisation&period=` | any executive | Ledger, newest first |
| GET · POST | `/purchases` | `credit.purchase` | List · start a purchase (`{ credits }`, optional `Idempotency-Key` header) |
| POST | `/payments/webhook` | the payment provider | Settles a purchase (public route; the driver verifies the event) |

- **Wallets:** one per organisation and one per executive, created on first use (`ledgerService.walletFor`,
  race-free through partial unique indexes). `balance` caches the ledger and changes only in
  `ledger_service.ts`, in the same transaction as its `credit_transactions` row (BR-11). The database
  rejects a negative balance, `reserved > balance`, a second wallet, and any UPDATE or DELETE of a
  ledger row (trigger `credit_transactions_append_only`). Corrections are new rows.
- **Idempotency:** every ledger row has a unique `idempotency_key` (e.g. `purchase:<id>`), so a replayed
  webhook or retried job never moves credits twice. A purchase repeated with the same `Idempotency-Key`
  returns the first one.
- **Purchases:** saved `pending`, then the provider is called after commit. Credits are added only when the
  provider's webhook confirms (`completed`), never on the app's word; otherwise `failed` with a reason.
  `PAYMENT_DRIVER=simulate` (testing stand-in; startup warns while it is used, see §7) settles with
  `{ reference, outcome: "paid" | "failed" }`. A real provider (SRS 12.2, still pending) is another driver
  in `integrations/payments/payment_provider.ts`; the API does not change. Price: `CREDIT_PRICE_PESEWAS`
  (default 4 = GHS 0.04 per credit; **set the agreed price**).
- **Permissions:** `credit.purchase` is new (the chairman has it with every permission).
- **Not built yet:** allocation to executives/units (FR-CR-03/04), reservation at dispatch (FR-CR-08/09),
  refunds. Until allocation exists, executive wallets stay at 0.
- **Logos:** `common/uploads/image_upload.ts`. PNG, JPEG or WebP, 2 MB max, random file names, checked by
  their real first bytes (a renamed file is rejected). Stored under `UPLOADS_DIR/organisation-logos/`
  (owner's choice: server disk for now; files are lost if the server is rebuilt, so move to object
  storage before production). Served from `/uploads` with `Cross-Origin-Resource-Policy: cross-origin`.
  The DB keeps the relative path (`organisations.logo_path`); responses build `logoUrl` from
  `PUBLIC_BASE_URL`. A replaced logo's old file is deleted after the change commits.
- **Verified end to end** on 2026-11-03 against PostgreSQL 17 on a throwaway database (38 checks):
  purchases, idempotency, webhook replay, every period, broadcasts filters, logo upload, serving and
  replacement, suspension blocking sign-in and sessions, and access rules.

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
- **Comments (owner's rule):** at most **5 per file**, each at most two lines, `//` only (never
  `/* */` or JSDoc). Only where the *why* is not obvious, written so a colleague new to the code
  understands it. No section dividers, no comments that restate the code.

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
