# Broadcastly — Web UI

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4.

**Read [`AGENTS.md`](./AGENTS.md) before your first commit.** Requirements live in
`../docs/Constituency_Communication_Platform_SRS_v1.0.docx`; the API contract is in `../api/AGENTS.md` §6.

## Run it

You need Node.js ≥ 24.11. Start the API first (`../api/README.md`).

```bash
cd web-ui
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server with reload (Turbopack)   |
| `npm run build`     | Production build                     |
| `npm start`         | Serve the production build           |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | TypeScript, no output                |
