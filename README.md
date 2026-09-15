# Rubies Code School — Management System

Mobile-first management system for Rubies Code School. Replaces the manual Sheets-and-email
workflow with class reporting, scheduling, curriculum tracking, class reminders, and parental
Strict Mode controls.

## Monorepo layout

```
apps/
  mobile/        Expo (React Native) — STUDENT app            → Person A
  web/           Next.js — TRAINER (responsive) + ADMIN        → (trainer) Person A, (admin) Person B
packages/
  shared/        TS types (API contract), design tokens, API client  → both
```

## Ownership

| Surface | Platform | Owner |
|---|---|---|
| Student | Mobile (Expo) | **Person A** |
| Trainer | Web (Next.js, responsive) — `app/(trainer)/*` | **Person A** |
| Admin | Web (Next.js) — `app/(admin)/*` | **Person B** |
| Backend, DB, API, email, auth logic | — | **Person B** |
| `packages/shared` (contract + tokens) | — | **both** |

`packages/shared/src/types.ts` **is the API contract.** Change it together; both sides build against it.

## Getting started

```bash
npm install            # from the repo root — installs all workspaces
npm run mobile         # start the Expo student app
npm run web            # start the Next.js trainer/admin app
npm run typecheck      # typecheck every workspace
```

Set the API base URL per app:
- Mobile: `apps/mobile/.env` → `EXPO_PUBLIC_API_URL=...`
- Web: `apps/web/.env.local` → `NEXT_PUBLIC_API_URL=...`

## Scope notes (2-week competition build)

- **Strict Mode is app-based** (in-app full-screen overlay), not an OS/kiosk lock.
- **Class-end release** = scheduled time only (no manual "End Class", no push infra).
- **Auth**: School ID + password, admin-driven resets. No SSO, no self-service reset.
- **Reminders**: local notifications at T-30 / T-10 / T-5 / T-0, cancelled on join.
