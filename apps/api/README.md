# Rubies API (Person B)

Express + TypeScript + Prisma (PostgreSQL) backend implementing every endpoint in
`packages/shared/src/types.ts` / `api.ts`, plus admin-only routes under `/admin`
for the Admin web console.

## Setup

```bash
cd apps/api
cp .env.example .env      # then fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY
npm install                # (or run from repo root: npm install)
npm run prisma:migrate     # creates the database tables
npm run seed                # creates one admin account (RCS-ADM-2026-001 / admin)
npm run dev                 # starts the API on http://localhost:3001
```

## How it's organized

```
src/
  index.ts          # Express app setup, route mounting
  routes/           # one file per resource, matches the endpoint catalog
  middleware/
    auth.ts         # requireAuth (JWT check), requireRole (authorization)
    error-handler.ts # central error handler + asyncRoute wrapper
  lib/
    prisma.ts       # Prisma client singleton
    jwt.ts          # sign/verify JWTs
    errors.ts       # HttpApiError — matches the client's ApiErrorBody envelope
    dto.ts          # maps Prisma rows -> exact contract shapes
    email.ts        # Resend integration for guardian report emails
prisma/
  schema.prisma     # database schema — mirrors SYSTEM_DESIGN.md §8
  seed.ts           # creates the first admin account
```

## Rules this code follows (read before changing anything)

1. **Every response matches `types.ts` exactly.** If you change a field here, you
   must change `packages/shared/src/types.ts` too, in the same PR — that file
   is the contract both frontend apps build against.
2. **Every error uses `HttpApiError`**, never a bare `throw new Error(...)` in a
   route. The central handler in `error-handler.ts` turns it into the
   `ApiErrorBody` shape the client expects. If you throw something else, the
   client can't parse the error properly.
3. **Auth check order:** `requireAuth` first (is this a valid logged-in user?),
   then `requireRole(...)` if the route is role-restricted. Never skip
   `requireAuth` on a route that touches another user's data.
4. **Wrap async route handlers in `asyncRoute(...)`** — Express 4 doesn't catch
   rejected promises on its own; without the wrapper, a thrown error in an
   `async` handler just hangs the request instead of returning an error.

## What's implemented vs. stubbed

- ✅ Auth (login, change-password), /me, schedule, curriculum, students,
  reports (with auto-advance + guardian email), join/strict-mode events,
  passcode verification, admin (user create/list, password reset, Strict
  Mode passcode set).
- 🚧 Not yet done: class session / enrollment CRUD for admin (creating
  classes, enrolling students) — needed before the system has any real data
  to serve. This is the next thing to build.

## Local testing without the frontend

```bash
# health check
curl http://localhost:3001/health

# login as the seeded admin
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"RCS-ADM-2026-001","password":"admin"}'
```
