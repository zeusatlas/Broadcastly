# Broadcastly — Frontend

Executive mobile application for Broadcastly.
Expo SDK 58 (React Native 0.88, React 19.3) · Expo Router · NativeWind v4 · TypeScript.

**Read [`AGENTS.md`](./AGENTS.md) before your first commit.** It carries the
binding conventions and security rules. Requirements live in
`../docs/Constituency_Communication_Platform_SRS_v1.0.docx`.

---

## Getting started

```bash
npm install
cp .env.example .env     # point EXPO_PUBLIC_API_URL at your backend
npm start
```

Start the backend first (`../api/README.md`). On a phone, `localhost` is
the phone itself, so set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g.
`http://192.168.1.20:8000/api/v1` (`ipconfig` shows it). Restart `npm start`
after changing `.env`.

Press `i` for iOS, `a` for Android, `w` for web.

The project runs in **Expo Go only** — scan the QR code with the Expo Go app.
No development builds and no native modules outside what Expo Go bundles.
Read the dependency policy in AGENTS.md §3 before installing anything.

| Command                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `npm start`              | Metro dev server                     |
| `npm run typecheck`      | `tsc --noEmit`                       |
| `npm run lint`           | ESLint                               |
| `npm run format`         | Prettier + Tailwind class sorting    |
| `npm run check:contrast` | Verify palette against WCAG AA       |
| `npm run doctor`         | Diagnose dependency / config issues  |

---

## Structure

Feature-first, domain-driven: code is grouped by business domain, not by file type.

```
src/
├── app/                Routes only (kebab-case — Expo Router maps filenames to URLs)
│   ├── _layout.tsx     Auth guard: (app) when signed in, (auth) when signed out
│   ├── (auth)/         sign-in · forgot-password
│   └── (app)/          (tabs)/ + stacked screens; permission guards in _layout.tsx
├── features/           auth · dashboard · organisation · members · broadcasts
│                       approvals · credits · reports · notifications · settings
│   └── <domain>/       api/ · components/ · hooks/ · store/ · utils/ · types.ts · index.ts
├── components/
│   ├── ui/             Primitives: Button, Card, Badge, Text, Screen, Placeholder
│   └── shared/         App-level composites: AppTabs, ErrorFallback, ExternalLink
├── config/env.ts       Validated environment
├── constants/          theme.ts (token mirror) · routes.ts (route → access map)
├── hooks/              use_theme · use_query · use_mutation
├── lib/                api/ (apiSlice, http, ApiError) · logger · store_reset
├── utils/              helpers/ (cn, …) · crypto/ (idempotency keys) · storage/ (secure store)
├── types/              api/ (ApiResponse, ErrorResponse, Paginated) · models/ (User, Permission)
└── global.css          Single source of truth for colour
```

`features/auth/` is the fully-implemented reference module. The other features
are stubs: each file states what belongs in it. Replace a stub when you build it.

Components are `PascalCase.tsx`; lib, hooks, stores and api modules are
`snake_case.ts`. Full conventions in AGENTS.md §4–§6.

---

## Colour

`src/global.css` holds every colour, in two layers: `--brand-*` (the approved
palette, never used directly) and semantic tokens that components consume.
`tailwind.config.js` only maps them to utility names.

Always pair a surface with its foreground — that is what makes contrast automatic:

```tsx
<View className="bg-primary">
  <Text className="text-primary-foreground">Send broadcast</Text>
</View>
```

Opacity modifiers work (`bg-primary/10`) because tokens are stored as bare HSL
channels rather than hex.

**Typography is Manrope.** Weight utilities (`font-bold`) do not work in React
Native — each weight is its own registered family. Use `font-sans`,
`font-sans-medium`, `font-sans-semibold`, `font-sans-bold`,
`font-sans-extrabold`, or just a `<Text variant>`.

**Two golds.** Heritage Gold `#C08A2E` is 2.66:1 on Stone, below the 3:1 WCAG
needs for non-text UI. `accent` is the exact brand gold, for **filled surfaces**
where the paired foreground carries text at 5.50:1. `accent-emphasis` (`#8D6520`,
4.64:1) is for **standalone** gold — icons, dividers, links.

**`critical` is rationed** — urgent CTAs and critical notices only. Ordinary
failures use `destructive`.

Changing a token: edit `global.css`, mirror it in `constants/theme.ts`, run
`npm run check:contrast`, then open `/design-system` and check both themes.

---

## API, state and errors

Data stack: **Zustand + axios** (no RTK Query / TanStack Query). Each feature
defines its endpoints in `features/<domain>/api/<domain>_api.ts`, registers
them in `src/lib/api/apiSlice.ts`, and exposes them as hooks:

```ts
// define — one argument: credentials, params or { uuid, credentials }
export const reservationsEndpoints = {
  readReservations: (params: PageParams, options?: RequestOptions) =>
    http.get<Paginated<ReservationResponse>>('/reservations', { ...options, params }),
  rejectReservation: ({ uuid, credentials }: { uuid: string; credentials: RejectReservationRequest }) =>
    http.patch<RejectReservationResponse, RejectReservationRequest>(`/reservations/${uuid}/reject`, credentials),
};

// expose
export const useReadReservationsQuery = (params: PageParams) =>
  useQuery(['reservations', 'list', params], (options) => api.reservations.readReservations(params, options));
export const useRejectReservationMutation = () => useMutation(api.reservations.rejectReservation);

// use
const { data, isLoading, error } = useReadReservationsQuery({ page: 1 });
const { mutate, isPending } = useRejectReservationMutation();
const response = await mutate({ uuid, credentials: { reason } }); // ApiResponse<…> | undefined
```

Every response is `ApiResponse<T>` — `{ status, status_code, message, data }`.

Importing `axios` or a `*_api.ts` file directly is a lint error.

Every failure arrives as an `ApiError` — branch on `error.kind`, show
`error.message`, put `error.fieldError('phone')` beside inputs. Use
`useMutation` for writes; it blocks double-submits. Expired sessions refresh
once automatically; if that fails, the user is signed out and every store is wiped.

Protected routes: the root layout is the only auth guard; `constants/routes.ts`
is the only access map. Inside screens, use the access hooks from
`@/features/auth` — `useHasPermission`, `useHasRole`, `useCan(rule)`,
`useAccess()` — or `<PermissionGate>`. Details in AGENTS.md §9.

Zustand for client state, inside the feature. Subscribe to the narrowest slice.

`EXPO_PUBLIC_*` values are inlined into the bundle and readable by anyone who
installs the app. Never put a secret there.

---

## Known gaps

- **Backend contract** — endpoint paths, the sign-in response and the error body
  shape are provisional. Align `features/auth/api/auth_api.ts`, `lib/api/errors.ts`
  and `lib/api/types.ts` with the OpenAPI spec once it is published.
- **Sign-in UI** — `(auth)/sign-in.tsx` is a placeholder, so the app stops at
  the sign-in screen until `SignInForm` is built and a backend is reachable.
- **Role-aware tabs** — the tab list is static; per FR-IAM-03 it must derive
  from the executive's permissions and scope.
- **Design system screen** — at `/design-system`. Developer reference; remove
  the route before release.
- **Dashboard data** — static placeholders in
  `features/dashboard/screens/DashboardScreen.tsx`. Wire to `dashboard_api.ts`.
- **Tailwind 4** — pinned to NativeWind 4 + Tailwind 3 until NativeWind 5 is
  stable (it is a release candidate as of October 2026). Planned upgrade.
