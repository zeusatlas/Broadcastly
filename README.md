# Broadcastly

Executive-focused communication platform for party constituencies: organisational
structure and appointments, member directory, official bulk SMS with
approvals, credits and delivery reports.

Requirements: [`docs/Constituency_Communication_Platform_SRS_v1.0.docx`](./docs/).

| Folder                     | What                                  | Stack                                                          |
| -------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| [`api/`](./api/)         | REST API (`/api/v1`) + job worker     | Node 24, Express 5, TypeScript, PostgreSQL 17, TypeORM, Redis   |
| [`mobile-ui/`](./mobile-ui/) | Executive mobile app                  | Expo SDK 58 (Expo Go), React Native, Zustand, axios, NativeWind |
| [`web-ui/`](./web-ui/)     | Web app                               | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4   |

Each folder has a `README.md` (how to run it) and an `AGENTS.md` (the binding
rules — read it before your first commit).

## Quick start after cloning

**You need:** Node.js ≥ 24.11, Docker Desktop (running), PostgreSQL 17 with
pgAdmin (or use the Docker database instead), and the Expo Go app on your phone.

```bash
# 1. Backend — full details and troubleshooting in api/README.md
cd api
npm install
npm run setup               # creates .env with a fresh secret
#    database: put your PostgreSQL details in .env (DB_*). With DB_AUTO_CREATE=true and
#              DB_AUTO_MIGRATE=true the API creates the "broadcastly" database and its tables
#              on first start (or run scripts/create_database.sql; or services:up + DB_PORT=55432)
npm run services:up         # Redis + PostgreSQL in Docker
npm run dev                 # http://localhost:8000/api/docs
npm run seed                # dev chairman: chairman.test@xmaple.com / 0241234567
npm run executive:create    # or create your own executive (email, phone, date of birth)

# 2. App — in a second terminal; details in mobile-ui/README.md
cd mobile-ui
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL to http://<your-LAN-IP>:8000/api/v1
npm start                   # scan the QR code with Expo Go
```

The app and API share one response contract,
`{ status, status_code, message, data }` — see `api/AGENTS.md` §6.
