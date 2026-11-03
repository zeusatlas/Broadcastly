# AGENTS.md — Broadcastly (mobile-ui)

Binding rules for every agent and developer working in this repository.
Read this fully before the first edit. These rules are not suggestions.

Product requirements: `../docs/Constituency_Communication_Platform_SRS_v1.0.docx`.
Requirement IDs cited below (FR-\*, NFR-\*) refer to that document.

---

## 1. What this product is

An **executive mobile application** for Broadcastly, a constituency communication platform.
Authorised party executives manage organisational records and send official
bulk SMS to party members. Members are recipients — there is no member-facing
app in the MVP.

**This is not** a social network, feed, forum, direct-messaging app, campaign
persuasion engine or fundraising tool. Do not build toward those.

The platform processes data associated with political affiliation, which is
sensitive personal data under Ghana's Data Protection Act, 2012 (Act 843).
Treat every member record accordingly.

---

## 2. Non-negotiable rules

1. **Never invent product behaviour.** If the SRS does not specify it, do not
   build it. Ask. Placeholder screens are preferable to invented features.
2. **Never hard-code a colour.** All colour comes from `src/global.css` tokens.
3. **Never put a secret in the app.** `EXPO_PUBLIC_*` is inlined into the bundle
   and readable by anyone who installs the app (NFR-SEC-02). API keys, provider
   credentials and payment secrets are server-side only.
4. **Client-side permission checks are for display only.** Hiding a control is
   not access control (FR-IAM-05). Never let the client be the only gate.
5. **Never make a send or payment action retry-unsafe.** Dispatch and credit
   operations must not double-fire on a repeated tap or a retry
   (FR-SMS-14, NFR-REL-01, NFR-REL-03).
6. **Run `npm run typecheck` and `npm run lint` before declaring work done.**
   Both must be clean.
7. **Expo Go only.** The app must always run in Expo Go. No custom native
   modules, no development builds, no `expo prebuild`. See §3.
8. **No new dependency without justification.** Follow the dependency policy
   in §3. When in doubt, write the 20 lines yourself.

---

## 3. Expo — do not trust training data

Expo ships breaking changes every SDK release. Before writing code against any
Expo, EAS or React Native API:

1. Read the `expo` major version in `package.json` (currently **SDK 58**).
2. Fetch the matching docs: `https://docs.expo.dev/versions/v58.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt` and follow its
   links. Never answer from memory.

```bash
npx expo install <package>   # ALWAYS use this, never npm/yarn/pnpm add
npx expo start
npx expo lint
npx tsc --noEmit
npx expo-doctor
npx expo install --fix
```

### Expo Go only

The whole team develops and tests in **Expo Go**. Expo Go ships a fixed set of
native modules — the Expo SDK modules plus a few community libraries it bundles
(Reanimated, Gesture Handler, Screens, Safe Area Context, SVG, …). Anything
else with native code will crash in Expo Go at runtime, even if it installs and
typechecks.

- **Allowed:** Expo SDK packages (`expo-*`) and pure-JavaScript libraries, as long as they run in
  Expo Go (owner's rule: Expo Go compatibility is the test).
- **Allowed:** community native libraries **only** if Expo Go bundles them.
  Check the package's page in the Expo SDK docs, or that `npx expo install`
  picks a version for it, which means it is in the SDK's compatibility list.
- **Forbidden:** any library whose README says "requires a development build",
  "does not work in Expo Go", "run `pod install`" or "link the native module".
- **Forbidden:** `expo prebuild`, `expo run:ios|android`, `ios/` and `android/`
  folders, `react-native link`, custom config plugins that add native code.
- **Verify on a device.** A clean typecheck proves nothing about native
  modules. Open the change in Expo Go on a phone before declaring it done.

### Dependency policy

Every dependency is a long-term maintenance and security liability. Before
adding one, all of these must hold:

1. **It is needed now.** No speculative installs "for later". Remove anything
   that becomes unused.
2. **It runs in Expo Go** (above).
3. **It is healthy:** a published release within the last ~6 months, active
   maintainers or a company behind it, issues being answered, broad adoption
   (weekly downloads in the tens of thousands or more), TypeScript types
   included, and a licence compatible with commercial use (MIT, Apache-2.0,
   BSD, ISC).
4. **It is not abandoned or deprecated**, and is not a fork of an abandoned
   project. Check `npm view <pkg> time.modified deprecated` and the repo.
5. **It does not duplicate something we already have.** UI → React Native / Expo
   components first, then our primitives in `components/ui/`, then gluestack-ui
   (see §7). Icons → lucide-react-native. HTTP → axios via `@/lib/api`.
   State → Zustand. Classes → `cn` from `@/utils/helpers`.
   Storage → `@/utils/storage`. IDs/hashing → `@/utils/crypto`.
   Haptics → `haptics` from `@/utils/haptics` (never import expo-haptics directly).
6. **It is small relative to what it saves.** Do not pull a library for a
   one-function helper (`lodash`, `moment`, date pickers for one field, …).

Install with `npx expo install <pkg>` so the version matches SDK 58. Name the
package and the reason in the PR description; a reviewer must agree.

---

## 4. Naming conventions

Strict. No exceptions beyond the one framework constraint noted below.

| Thing                         | Convention                  | Example                         |
| ----------------------------- | --------------------------- | ------------------------------- |
| Component files               | `PascalCase.tsx`            | `BroadcastComposer.tsx`         |
| React components              | `PascalCase`                | `BroadcastComposer`             |
| lib / helpers / hooks / store | `snake_case.ts`             | `use_theme.ts`, `auth_store.ts` |
| Feature API module            | `<domain>_api.ts`           | `broadcasts_api.ts`             |
| Endpoints object in it        | `<domain>Endpoints`         | `broadcastsEndpoints`           |
| Feature store                 | `<thing>_store.ts`          | `composer_store.ts`             |
| Interfaces and types          | `PascalCase`                | `OrganisationalUnit`            |
| Request body / query          | `<Action><Thing>Request`    | `CreateMemberRequest`           |
| Response `data` payload       | `<Thing>Response`           | `MemberResponse`                |
| Component props               | `<Component>Props`          | `ButtonProps`                   |
| Constants                     | `SCREAMING_SNAKE_CASE`      | `MAX_SEGMENT_COUNT`             |
| Functions and variables       | `camelCase`                 | `estimateSegments`              |
| Booleans                      | `is` / `has` / `can` prefix | `isDispatching`                 |

**Framework exception:** files in `src/app/` are Expo Router routes and their
filenames become URL segments. They stay lowercase kebab-case
(`design-system.tsx` → `/design-system`). The one other exception is
`lib/api/apiSlice.ts`, named by team choice.

**`interface` for every object shape** — request bodies, response payloads,
props, store state (lint-enforced). `type` only for unions, aliases and
mapped/utility types (`type SessionStatus = 'restoring' | 'signed_in'`).
Every endpoint has a `…Request` interface for what it sends (if anything) and
a `…Response` interface for its `data`.

**Imports.** Inside a feature, use relative paths (`../api/broadcasts_api`).
Everything else uses the `@/` alias. Never `../../..` out of a feature.

---

## 5. Comments

**Stub files.** A file that only reserves a name holds one or two comment lines
describing its purpose, then `export {};`. Replace the whole file when you
implement it.


Write code that does not need explaining. Then explain only what the code
cannot say itself.

- **At most 5 comments per file** (owner's rule), each one or two lines.
- **`//` only.** No `/* */`, no JSDoc. In JSX, put the `//` comment between the element's props,
  never as a `{/* */}` child. `global.css` is the one exception (CSS has no `//`), still at most 5.
- **One line.** If a comment needs a paragraph, the code is wrong.
- Comment **why**, never **what**. `// increment counter` is noise.
- A non-obvious constraint, a requirement ID, a deliberate trade-off or a
  workaround earns a comment. Nothing else does.
- No file-header banners, no section-divider art, no restating the type signature in prose.
- No commented-out code. Delete it; git keeps the history.
- `TODO` must say who or what unblocks it.

```ts
// ✅ earns its place
// Gold, not navy: on the dark canvas only gold clears 3:1 against the bar.

// ❌ noise
// This function returns the user's full name.
```

---

## 6. Project structure

Feature-first, domain-driven. Code is grouped by **business domain** (the SRS
sections), not by technical type.

```
src/
├── app/                    Expo Router routes only. Thin — compose from features/.
│   ├── _layout.tsx         Root: fonts, theme, session restore, THE auth guard.
│   ├── (auth)/             Public routes — reachable only while signed out.
│   └── (app)/              Protected routes — require a session.
│       ├── _layout.tsx     Permission guards, driven by constants/routes.ts.
│       ├── (tabs)/         Bottom tabs: index · broadcasts · members · credits · more
│       └── <domain>/…      Stacked screens: broadcasts/new, members/import, …
├── features/               Domain modules. Most new work goes here.
│   ├── auth/               Session, tokens, permissions. Reference implementation.
│   ├── onboarding/         First-launch intro carousel, shown once per device.
│   ├── dashboard/
│   ├── organisation/       Units, appointments (SRS §4.2)
│   ├── members/            Directory and spreadsheet imports (§4.4)
│   ├── broadcasts/         Compose, recipients, dispatch, templates (§4.5)
│   ├── approvals/          Approval workflow (§4.6)
│   ├── credits/            Balance, ledger, allocation (§4.7)
│   ├── reports/            Delivery reports and history (§4.8)
│   ├── notifications/      (§4.9)
│   ├── settings/           The More tab
│   └── platform/           Platform admin tools (admin/(tabs)): overview, organisations, executives, admins
├── components/
│   ├── ui/                 Generic primitives (Button, Card, Text…). No domain knowledge.
│   └── shared/             App-level composites used across features
│                           (AppTabs, ErrorFallback, ExternalLink).
├── config/env.ts           Validated environment. The only reader of process.env.
├── constants/              Static values, theme mirror, route access map.
├── hooks/                  Shared hooks (use_theme, use_query, use_mutation).
├── lib/                    Infrastructure clients, no domain knowledge.
│   ├── api/                axios client, http wrapper, ApiError,
│   │   └── apiSlice.ts     `api` — every endpoint, registered per domain.
│   ├── logger.ts           The only sanctioned logger.
│   └── store_reset.ts      Sign-out wipes every registered feature store.
├── utils/                  Framework-agnostic utilities, no domain knowledge.
│   ├── helpers/            Small pure helpers: cn, formatters, string/number utils.
│   ├── crypto/             expo-crypto wrappers: idempotency keys, random IDs.
│   ├── haptics/            expo-haptics wrapper: tick, tap, step, success. Safe on web.
│   └── storage/            expo-secure-store wrapper and the list of storage keys.
├── types/                  Shared kernel, grouped by category.
│   ├── api/                ApiResponse<T>, ErrorResponse, ErrorMessages, Paginated<T>.
│   └── models/             User, Permission, UserCategory, OrganisationalUnit.
└── global.css              Single source of truth for colour.
```

### Anatomy of a feature

```
features/broadcasts/
├── api/broadcasts_api.ts   `broadcastsEndpoints` — the ONLY place this feature's URLs live.
├── components/             PascalCase.tsx, presentational where possible.
├── hooks/                  use_<domain>_api.ts (use…Query / use…Mutation) and other use_*.ts.
├── store/                  Zustand, only for genuine client state (drafts, wizards).
├── utils/                  Pure domain logic. No React, no I/O. Easy to unit test.
├── screens/                Optional: full screens that a route file re-exports.
├── types.ts                …Request / …Response interfaces and domain types.
└── index.ts                Public API. The only file other code may import.
```

Create only the folders a feature needs. Flow of a request:
`screen → hook → api.<domain>.<endpoint> (apiSlice) → <domain>_api.ts → http → backend`.

**Where code goes:**

- `components/ui/` — would make sense in a completely different app. Knows
  nothing about broadcasts, members or appointments.
- `components/shared/` — app-specific but used by more than one feature or by
  `app/` itself (navigation chrome, error screens). Still no feature imports.
- `utils/` vs `lib/` — `utils/` holds small stateless helpers and thin wrappers
  over an Expo module; `lib/` holds configured infrastructure with state
  (the axios instance, the store reset registry). A helper used by only one
  feature lives in that feature's own `utils/`.
- `features/<domain>/` — one domain, everything together.
  **This is where most code belongs.**
- `app/` — routing and layout only. A route file is ideally one line:
  `export { DashboardScreen as default } from '@/features/dashboard';`

**Boundaries (lint-enforced):**

- Import a feature only through its `index.ts`: `@/features/broadcasts`, never
  `@/features/broadcasts/api/…`.
- Features should not depend on each other's internals. If two features need
  the same thing, it moves to `components/`, `utils/`, `lib/` or `types/`.
- `lib/`, `utils/` and `components/ui/` never import from `features/` — except
  `lib/api/apiSlice.ts`, which registers every feature's endpoints.
- Nothing imports a `*_api.ts` file except `apiSlice.ts`. Call `api.<domain>`.

---

## 7. Colour and theming

**Styling stack: NativeWind 4 + Tailwind CSS 3 — pinned deliberately.** The
team wants Tailwind 4, which needs NativeWind 5, still a release candidate as of
October 2026. Do not install `nativewind@5`, `tailwindcss@4` or any other styling
engine until NativeWind 5 ships stable; the upgrade will be one planned PR.
**UI library: gluestack-ui** (v3, NativeWind-based), chosen by the user. Order of
preference for any control: React Native / Expo component (`Pressable`, `Text`,
`ScrollView`, …) → our wrapper in `components/ui/` → a gluestack-ui component, added
**only when it is first actually used**, one component at a time. Never install the
whole kit speculatively. Style gluestack components with our tokens, never its palette.

`src/global.css` is the only place colour is defined. Two layers:

- `--brand-*` — the approved palette. **Never consumed directly by a component.**
- Semantic tokens (`--background`, `--primary`, `--destructive`, …) — what
  components use.

Always pair a surface with its matching foreground:

```tsx
// ✅
<View className="bg-primary">
  <Text className="text-primary-foreground">Send broadcast</Text>
</View>

// ❌ never
<View style={{ backgroundColor: '#0B2545' }} />
```

**Component style is chunky, Duolingo-like** (user's choice): `rounded-2xl`, 2px borders, a thicker
bottom edge on cards (`border-b-4`) and a darker 4pt lip under filled buttons that the face sinks onto
when pressed. Bold, large type. Reuse `Button`, `Card` and `TextField`; do not restyle per screen. **Use the chunky `Card` sparingly** (owner's rule): lists are plain rows with
hairline dividers (`BroadcastRow`, `SettingsRow`); a card is kept for the one or two things on a screen
that carry weight (a balance, a cost estimate, quick actions). Filters and single choices use `Chip`. Floating controls over content
(e.g. a pinned back button) sit on `GlassSurface`: Liquid Glass on iOS 26+, blur + tint elsewhere.
Forms scroll in `KeyboardAwareScrollView` (react-native-keyboard-controller), never `KeyboardAvoidingView`.

**Every stacked screen with a back button uses `PageScreen`** from `@/components/shared` (owner's rule:
one wrapper so header changes happen in one place). It gives a plain `bg-background` page, a round
Liquid Glass back button (`HeaderButton`, `GlassSurface`), an optional `headerRight` action drawn at
the same size, `buttonSize` (default `HEADER_BUTTON_SIZE`, 48pt), and a large `title` that collapses
into the bar on scroll. Register the route with `headerShown: false`. Never hand-roll a back button. Screens that close rather than go back pass `backIcon={X}`. Header-sized controls on a page without `PageScreen` (home avatar, bell) use `HEADER_BUTTON_SIZE` / `<HeaderButton isPlain>` so they match.
Inner pages stay plain — the wave/illustrated backgrounds are for sign-in and onboarding only.

**Tab home screens share one layout** (admin home and the executive/chairman dashboard): `HomeHeader`
(`@/components/shared`; the executive home passes no title: profile avatar left, bell right; the admin
home keeps eyebrow + name with the avatar on the right), a 2×2 grid of
plain `StatTile`s (card surface + border like `Card`; owner's rule: no coloured tiles, the only colour is the
small gold icon chip), then `ListCard`
sections (titled card + "View all") holding plain rows. `StatTile` and `ListCard` live in `components/ui`.
**Keep screens minimal** (owner's rule): one job per block, no repeated information, no placeholder or
empty-state sections for features the API does not serve yet. The dashboard is header → position · scope line →
four tiles (Members, Executives, Units, Positions from `GET /organisation/overview`, enabled only for
`appointment.manage` holders) → one row of quick actions. Credits, approvals and broadcasts tiles return when those API modules are mounted.
`QueryState` (loading / retryable error / empty) is in `components/ui`.

**Top and bottom bars match** (owner's rule): the tab bar is `background`, the same colour the status bar
sits on, with a hairline `border` top. Sign-in has no back button and verify has no close button; leaving
verify is the system back gesture, which returns to sign-in and drops the pending code.

**Phone chrome follows the theme** through `SystemBars` (root layout): status bar and Android
navigation bar icons (expo-status-bar, expo-navigation-bar) and the native window colour
(expo-system-ui). Never mount another `StatusBar`/`NavigationBar` or set colours per screen.

**The two golds.** Heritage Gold `#C08A2E` is only 2.66:1 against the Stone
background, below the 3:1 WCAG requires for non-text UI.

- `accent` — the exact brand gold. **Filled surfaces only.**
- `accent-emphasis` — darkened to 4.64:1. **Standalone gold**: icons, dividers,
  links, text on the page background.

**`critical` is rationed.** Signal Crimson is for urgent CTAs and critical
notices only. Ordinary failures and destructive actions use `destructive`.

**Typography is Manrope.** Each weight is a separately registered family, so
Tailwind fontWeight utilities (`font-bold`, `font-semibold`) DO NOT WORK —
React Native cannot derive a bold face from a regular one. Use the family
utilities instead: `font-sans`, `font-sans-medium`, `font-sans-semibold`,
`font-sans-bold`, `font-sans-extrabold`. Prefer a `<Text variant>` over raw
classes. Import new weights by subpath (`@expo-google-fonts/manrope/600SemiBold`)
so unused faces stay out of the bundle.

When a Tailwind class cannot reach (navigation options, SVG props,
`ActivityIndicator`), use `useTheme()` from `@/hooks/use_theme`.

`src/constants/theme.ts` is a **manual mirror** of `global.css`. Change one,
change the other, then run `npm run check:contrast`. That script parses
`global.css` directly and exits non-zero on failure.

---

## 8. Accessibility

Mandatory, not polish. Executives have varying technical experience (NFR-USE-01).

- Text contrast ≥ 4.5:1, non-text UI ≥ 3:1. Enforced by `npm run check:contrast`.
- Touch targets ≥ 44pt.
- Every interactive element gets `accessibilityRole` and `accessibilityLabel`.
- Never signal state by colour alone — pair it with text or an icon.

---

## 9. State and data

### Zustand

Client state lives in `features/<domain>/store/`. Shape every store the same way:
`State` type, `Actions` type, an `INITIAL_STATE` constant, and
`registerStoreReset(() => useXStore.setState(INITIAL_STATE))` so sign-out wipes
it. `features/auth/store/auth_store.ts` is the reference.

Subscribe to the narrowest slice, and export named selector hooks from the
feature rather than letting screens reach into the store:

```ts
export const useCurrentUser = () => useAuthStore((s) => s.user); // ✅
const { user } = useAuthStore(); // ❌ re-renders on every change
```

**The data stack is Zustand + axios. Do not add RTK Query, TanStack Query,
SWR or Redux.** Server reads and writes go through the per-endpoint hooks
below; Zustand holds genuine client state (session, drafts, wizards).

### API access — one `api` object from `apiSlice`

Every backend call in the app goes through one object:

```ts
import { api } from '@/lib/api/apiSlice';

const { data, message } = await api.members.createMember(credentials);
```

Three layers, each with one job:

| File                                     | Job                                                       |
| ---------------------------------------- | --------------------------------------------------------- |
| `features/<domain>/api/<domain>_api.ts`  | **Defines** that domain's endpoints. The only place its URLs live. |
| `lib/api/apiSlice.ts`                    | **Registers** every domain's endpoints on `api`.          |
| hooks, stores, screens                   | **Call** `api.<domain>.<endpoint>()`. Never import a `*_api.ts` file (lint error). |

Importing `axios` anywhere outside `lib/api/` is also a lint error.

Every backend response uses one envelope, defined in `types/api/api_response.ts`:

```ts
export interface ApiResponse<T = undefined> {
  status: string;
  status_code: number;
  message: string;
  data: T; // undefined for endpoints that return no data
}

export interface ErrorResponse {
  status: string;
  errors: ErrorMessages; // { [field]: string[] | string }
}
```

`http.get | post | put | patch | delete | upload` resolve to `ApiResponse<T>`,
where `T` is the `…Response` interface. Omit `T` when there is no data.
Adding an endpoint takes five steps:

```ts
// 1. features/reservations/types.ts — one Request and one Response interface per endpoint
export interface RejectReservationRequest {
  reason: string;
}

export interface RejectReservationResponse {
  uuid: string;
  status: string;
}

// 2. features/reservations/api/reservations_api.ts — define
import { http, type RequestOptions } from '@/lib/api';
import type { PageParams, Paginated } from '@/types/api';

export const reservationsEndpoints = {
  readReservations: (params: PageParams, options?: RequestOptions) =>
    http.get<Paginated<ReservationResponse>>('/reservations', { ...options, params }),

  readReservation: ({ uuid }: { uuid: string }, options?: RequestOptions) =>
    http.get<ReservationResponse>(`/reservations/${uuid}`, options),

  rejectReservation: ({ uuid, credentials }: { uuid: string; credentials: RejectReservationRequest }) =>
    http.patch<RejectReservationResponse, RejectReservationRequest>(
      `/reservations/${uuid}/reject`,
      credentials,
    ),

  cancelReservation: ({ uuid }: { uuid: string }) =>
    http.delete(`/reservations/${uuid}`), // ApiResponse<undefined>
};

// 3. lib/api/apiSlice.ts — register
export const api = {
  // …
  reservations: reservationsEndpoints,
};

// 4. features/reservations/hooks/use_reservations_api.ts — expose as hooks
import { useMutation } from '@/hooks/use_mutation';
import { useQuery } from '@/hooks/use_query';
import { api } from '@/lib/api/apiSlice';

export const useReadReservationsQuery = (params: PageParams) =>
  useQuery(['reservations', 'list', params], (options) =>
    api.reservations.readReservations(params, options),
  );

export const useRejectReservationMutation = () =>
  useMutation(api.reservations.rejectReservation);

export const useCancelReservationMutation = () =>
  useMutation(api.reservations.cancelReservation);

// then re-export them from features/reservations/index.ts

// 5. screen
const { data, isLoading, error, refetch } = useReadReservationsQuery({ page: 1 });
const { mutate, isPending, error: rejectError } = useRejectReservationMutation();

const response = await mutate({ uuid, credentials: { reason } });
if (response) showToast(response.message); // ApiResponse<RejectReservationResponse>
```

**Endpoint signature rules** — exactly one argument, then optional `RequestOptions`:

| Endpoint needs          | Argument                                   |
| ----------------------- | ------------------------------------------ |
| Body only               | `credentials: XxxRequest`                  |
| Path id only            | `{ uuid }`                                 |
| Path id and body        | `{ uuid, credentials }`                    |
| Query string (lists)    | `params: XxxParams` (or `PageParams`)      |
| Nothing                 | no argument                                |

Reads always accept `options?: RequestOptions` and pass it to `http`, so
`useQuery` can cancel them on unmount.

**Hook rules:**

| Hook                     | For                       | Returns                                                     |
| ------------------------ | ------------------------- | ----------------------------------------------------------- |
| `use<Endpoint>Query`     | GET                       | `data`, `message`, `response`, `error`, `isLoading`, `isFetching`, `refetch` |
| `use<Endpoint>Mutation`  | POST / PUT / PATCH / DELETE | `mutate(args)`, `data`, `isPending`, `error`, `isError`, `reset` |

- Name hooks after the endpoint: `rejectReservation` → `useRejectReservationMutation`.
- The query key lists every argument the request uses: `['reservations', 'list', params]`.
  A new key refetches; the old data is never shown under the new key.
- After a mutation changes data a list shows, call that list's `refetch()`.
- `mutate` never throws and ignores repeat calls while one is in flight
  (FR-SMS-14). It resolves to the `ApiResponse`, or `undefined` on failure —
  read `error` then.

There is no per-endpoint `transformErrorResponse`: every failure is already
an `ApiError`, and `error.response` holds the typed `ErrorResponse` body.

`apiSlice.ts` is the one file in `lib/` that imports from `features/`. Always
import it by its full path, `@/lib/api/apiSlice`; it is deliberately **not**
re-exported from `@/lib/api`, because the endpoint files import `@/lib/api`
and that would create a circular import.

Failures never resolve — they reject with an `ApiError` (below). The client
underneath:

- attaches the bearer token and times out at 20s;
- on a 401, refreshes the session **once** (concurrent 401s share one refresh)
  and replays the request; if refresh fails, the session ends everywhere;
- turns every failure into an `ApiError`. Raw axios errors never escape.

Writes that move money or send SMS carry an `idempotencyKey` from
`createIdempotencyKey()` in `@/utils/crypto`, created **once per user intent** (when the confirm sheet
opens), so a retry reuses it.

### Error handling

One error type, four layers:

| Layer               | Responsibility                                                 |
| ------------------- | -------------------------------------------------------------- |
| `lib/api/errors.ts` | Normalise every failure to `ApiError` with a `kind`.           |
| feature hook/store  | Catch, keep `error: ApiError \| null` in state. Never rethrow to UI. |
| component           | Show `error.message`; `error.fieldError('email')` beside inputs. |
| `ErrorFallback`     | Root `ErrorBoundary` for render crashes.                       |

`ErrorResponse.errors` arrives as `string | string[]` per field; `ApiError`
normalises it to `fieldErrors: Record<string, string[]>`, and `error.message`
falls back to the first field error when the body has no message.

Branch on `error.kind`, never on status codes or message text:
`validation`, `unauthorized`, `forbidden`, `not_found`, `conflict`,
`rate_limited`, `server`, `network`, `timeout`, `cancelled`, `unknown`.
`error.isRetryable` tells you whether to offer "Try again". `ApiError.message`
is always safe to show: 5xx server text is never surfaced.

`useQuery` and `useMutation` already catch and expose `error`; screens never
write their own try/catch around an API call.

### Route protection

There are exactly three guard points. Do not add redirects inside screens.

1. **Authentication** — `app/_layout.tsx` wraps `(app)` and `(auth)` in
   `Stack.Protected`. Signed out, `(app)` does not exist; signed in, `(auth)`
   does not exist. The splash screen stays up until the session is restored.
2. **Role** — `app/(app)/_layout.tsx`: `user.role === 'platform_admin'` gets `admin/(tabs)`
   (`ADMIN_TABS`: Home, Organisations, Admins; an organisation's executives live on its page,
   `admin/organisations/[id]`); everyone else gets `(tabs)`
   (`EXECUTIVE_TABS`). One login for both (owner's decision); the API re-checks every request.
3. **Permission** — the same layout reads `GATED_ROUTES` in `constants/routes.ts` for executive
   screens. To gate a new screen, add one line there.

**Sign-in is two steps** (no passwords): `sign-in` sends email + phone (`requestCode`), the
store keeps a `PendingChallenge`, and `verify-otp` — guarded in `(auth)/_layout.tsx` by
`usePendingChallenge() !== null` — submits the 6-digit SMS code (`verifyCode`, `resendCode`,
`cancelChallenge`). Every sign-in endpoint passes `skipAuthRefresh`: its 401 means wrong details or
code, never an expired session. Phones are checked with `normaliseGhanaPhone` from `@/utils/helpers`.
A 404 from verify or resend means the sign-in itself is over: cancel the challenge and go back.

**Sessions last 24 hours from sign-in** (backend `SESSION_TTL_HOURS`; refreshing never extends
them). Tokens carry `sessionExpiresAt`, stored in `secureStorage`. On launch `restore()` ends an
expired session with no network call and restores a live one (the client refreshes the access
token itself), so the guard opens home or sign-in. `useSessionExpiry` (root layout) ends the
session at the deadline while open and on resume, and shows "Your session has ended".

**Profile → Settings → Help & Support** (`features/settings`): profile's gear opens `/settings`, whose
rows are `SettingsSection` + `SettingsRow` / `SettingsExpandableRow`. Settings and support rows are
UI only for now (no values or actions wired).

**Sign-out** lives on the profile screen (`features/settings`, route `(app)/profile`, slides up
from the dashboard avatar). It always asks first (`ConfirmDialog`), then `signOut({ allDevices })`.
`signOut` is deliberately *not* `skipAuthRefresh`: an expired access token is refreshed first, so
the server really revokes the session. The device is signed out even if the call fails.

**Feedback is toasts** (sonner-native, styled in `components/shared/AppToaster.tsx`). Show them
only through `notify` from `@/lib/notify` (lint-enforced): `success`, `error`, `warning`, `info`,
`apiError(err)` (rate limits become warnings). Each comes with its haptic. Field validation stays
inline under its field. Buttons that fetch pass `isLoading` and a `loadingLabel` ("Sending code…").

**Onboarding** is not a third guard but a `Stack.Protected` inside `(auth)/_layout.tsx`:
shown while `useOnboardingStatus() === 'pending'`, then sign-in. The "seen" flag
(`STORAGE_KEYS.onboardingSeen`) is per device and survives sign-out on purpose.

### Role-based access and permissions

The user returned by the backend carries `category` (role) and `permissions`.
Both are data, assigned and revoked server-side (FR-IAM-04) — never hard-code
who can do what in a component. Every check goes through one pure function,
`checkAccess(user, rule)` in `features/auth/utils/access_policy.ts`, and one
declarative rule type:

```ts
type AccessRule = {
  permission?: Permission; // must have this one
  anyOf?: readonly Permission[]; // must have at least one
  allOf?: readonly Permission[]; // must have all
  roles?: readonly UserCategory[]; // must be one of these roles
}; // every field present must pass
```

Use the hook that fits, all from `@/features/auth`:

| Need                         | Use                                                          |
| ---------------------------- | ------------------------------------------------------------ |
| One permission               | `useHasPermission('broadcast.send')`                         |
| Any / all of several         | `useHasAnyPermission(a, b)` · `useHasAllPermissions(a, b)`   |
| Role                         | `useHasRole('constituency_chairman')`                        |
| Combined rule                | `useCan({ anyOf: [a, b], roles: [r] })`                      |
| Many checks in one component | `useAccess()` → `can` · `canAny` · `canAll` · `hasRole` · `check` |
| Show/hide a block of JSX     | `<PermissionGate permission="…" fallback={…}>`               |
| A whole screen               | one line in `GATED_ROUTES`                                   |
| Outside React                | `checkAccess(user, rule)`                                    |

Rules:

- **Prefer permissions over roles.** Per BR-01, access comes from appointment,
  permissions and scope — not title. Use `roles` only where the SRS names a
  role explicitly.
- **Scope is server-side only.** The client cannot see which units an
  executive may reach, so never filter or gate by unit on the device (FR-IAM-03).
- **A new permission** is added to the `Permission` union in `types/models/user.ts`
  only once the backend defines it.
- All of this is UX. The backend is the access control (FR-IAM-05).

---

## 10. Security and privacy

Derived from SRS §8. Apply these as a security architect would, by default.

- **No secrets in the bundle** (NFR-SEC-02). See rule 2.3.
- **Tokens go in `secureStorage` from `@/utils/storage`** (expo-secure-store,
  device-only keychain), never AsyncStorage — it is unencrypted. On web the
  session is memory-only by design. Every persisted key is listed in
  `utils/storage/storage_keys.ts`.
- **Release builds refuse a non-HTTPS API URL** (`config/env.ts`).
- **Sign-out wipes everything**: tokens, auth state, and every store that
  registered with `registerStoreReset`.
- **Log only through `logger`** from `@/lib/logger`. `console.*` is a lint error.
- **Permissions and scope are enforced server-side** (NFR-SEC-03, FR-IAM-05).
  The access hooks (§9) decide what to render, nothing more.
- **Scope the request, not the response.** Never fetch a broad list and filter
  client-side — the data should never reach the device (FR-IAM-03).
- **Minimise what you hold.** Do not cache or log member personal data beyond
  what the screen needs (NFR-PRIV-01).
- **Never log** phone numbers, member names, tokens or message bodies.
- **Destructive and dispatch actions require explicit confirmation**, showing
  audience, message, estimated segments and estimated cost first (NFR-USE-02).
- **Guard against double-dispatch**: disable the control while in flight and
  carry an idempotency key where the backend supports one (FR-SMS-14).
- A delivered status is never presented as proof the recipient read the
  message (FR-REP-03).

---

## 11. Scalability

The system must absorb growth in members, executives, broadcasts and delivery
records without a redesign (NFR-SCALE-01). On the client that means:

- **Paginate every list.** Member and delivery-report lists will reach tens of
  thousands of rows. Never render an unbounded array.
- Use `FlatList`/`FlashList` with stable `keyExtractor`. Never `.map()` a large
  list into a `ScrollView`.
- Long-running work (imports, dispatch) is asynchronous and server-side
  (NFR-PERF-01). The client polls or subscribes for status — it never blocks.
- Keep components small and props explicit. Memoise only after measuring.
- Derive state; do not duplicate it across stores.

---

## 12. Definition of done

Before declaring any task complete:

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run check:contrast` passing, if colour changed
- [ ] No hard-coded colours, no secrets, no `console.log` of personal data
- [ ] Naming follows §4; comments follow §5
- [ ] Lists are paginated and virtualised
- [ ] Interactive elements have accessibility labels and ≥44pt targets
- [ ] Anything unverified is stated plainly, not implied as working
