# Build Status — Rubies Code School Management System

_Last updated: 2026-09-21_

## Recent fixes

### 2026-09-21 — Trainer web layout broken (Tailwind v4 theme namespace collision)

**Symptom:** on `/login`, `/change-password`, and `/report`, headings/body text wrapped one word per line despite plenty of horizontal room, and `<input>`/`<select>` elements rendered as tiny (~12–30px) squares instead of full-width fields. Colors, flex proportions, and the two-panel login layout were unaffected.

**Root cause:** `apps/web/app/globals.css`'s `@theme` block defines a named spacing scale (`--spacing-2xs` … `--spacing-3xl`) using Tailwind's own t-shirt-size vocabulary (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`). In Tailwind v4, the `--spacing-*` namespace is shared by every spacing-based utility — including `max-w-*` — and it takes priority over the framework's own default `--container-*` scale whenever a same-named key exists. So `max-w-sm` resolved to `var(--spacing-sm)` (12px) instead of the intended `--container-sm` (24rem/384px); `max-w-xs` → 8px instead of 320px; `max-w-2xl` → 48px instead of 672px. That collapsed the login/change-password form and the report page's content column to a few pixels wide, forcing every word inside onto its own line and squeezing the inputs down to near-zero.

Confirmed empirically (not guessed) with an isolated Tailwind v4 PostCSS build: a clean default theme resolves `max-w-sm` to `var(--container-sm)` correctly; reintroducing just this project's `--spacing-*` block reproduces the bug; explicitly adding `--container-sm` etc. *alongside* the colliding `--spacing-sm` does **not** fix it — `--spacing-*` wins regardless. Verified live in a real browser (Playwright + the pre-installed Chromium) before and after the fix: `form` computed `max-width` went from `12px` → `384px`, input `width` from `30px` → `384px`.

**Fix:** replaced the four affected `max-w-{size}` usages with explicit arbitrary-value classes carrying the originally-intended standard Tailwind sizes — `max-w-[20rem]`, `max-w-[24rem]` (×2), `max-w-[42rem]` — in `app/(trainer)/login/page.tsx`, `app/(trainer)/change-password/page.tsx`, `app/(trainer)/(app)/report/page.tsx`. No change to `globals.css` or `packages/shared`; the named `--spacing-*` scale itself is untouched and still works correctly for `p-*`/`gap-*`/`m-*`/etc., which don't collide with any Tailwind default namespace.

**Watch for:** any future `w-{size}`, `h-{size}`, `min-w-{size}`, `min-h-{size}`, `max-h-{size}` utility (not just `max-w-*`) with `{size}` ∈ `{xs,sm,md,lg,xl,2xl,3xl}` will hit the same collision (confirmed none exist elsewhere in the codebase as of this fix). Use an arbitrary-value class (e.g. `w-[24rem]`) instead of the bare named utility for those, or a value outside the t-shirt-size vocabulary.

A monorepo for Rubies Code School. **Person A (me/you)** owns the Student **mobile app** (Expo) and the Trainer **web pages** (Next.js). **Person B** owns the backend, database, APIs, email, and the Admin dashboard.

**Deadline:** ~2 weeks (competition) → target ~2026-09-23.

---

## Locked decisions (scope guardrails)

- **One shared monorepo** (npm workspaces): `packages/*` + `apps/*`.
- **Student = mobile only** (Expo / React Native). **Trainer = responsive web only** (Next.js). **Admin = web** (Person B).
- **Strict Mode is app-based** (in-app overlay), **not** an OS/kiosk lock.
- **Cut from the designs:** SSO, forgot-password/self-service reset, role tabs, join telemetry dashboards. Password resets are admin-driven.
- **Auth model:** School ID (`RCS-[ROLE]-[YEAR]-[ID]`) + default password = surname → forced change on first login (`mustChangePassword`). JWT bearer token.
- **`packages/shared/src/types.ts` is the API contract** — the single source of truth both sides code against.

---

## Architecture

```
rubies-management-system/
├── packages/shared/        @rubies/shared — types (API contract) + design tokens + typed fetch client
├── apps/mobile/            Student app (Expo SDK 57, expo-router, React 19)
└── apps/web/               Trainer + Admin web (Next.js 16, Tailwind v4, React 19)
```

- Shared package is consumed as **raw TypeScript** (Metro `watchFolders` for mobile; `transpilePackages` for Next). No build step.
- Design system: deep purple `#2B1450` structure + rationed orange `#FF7A29` CTA; Space Grotesk / Inter / JetBrains Mono; "structural containment over floaty shadows."

---

## ✅ Done

### Repo / tooling
- [x] Root `package.json` (workspaces, `mobile`/`web`/`typecheck`/`lint` scripts), `tsconfig.base.json`, `.gitignore`, `README.md`.
- [x] Root `npm install` (workspaces linked) — exit 0.

### `packages/shared` (the contract)
- [x] `src/types.ts` — entities, DTOs, error envelope (**API contract**).
- [x] `src/tokens.ts` — colors, spacing, radius, fontFamily/Size/Weight, roleBadge.
- [x] `src/api.ts` — `createApiClient()` (auth, me, schedule, curriculum, students, reports, events, strictMode) + `ApiError`.
- [x] `src/index.ts` — barrel export. `package.json` + `tsconfig.json`.

### `apps/mobile` (Student)
- [x] Wired to workspace: `@rubies/shared`, `@tanstack/react-query`; `metro.config.js` monorepo config.
- [x] Native modules installed: `expo-secure-store`, `expo-notifications`.
- [x] **lib/**: `config.ts` (API base URL), `theme.ts` (token re-exports), `storage.ts` (secure token), `api.ts` (client instance), `auth.tsx` (AuthProvider/useAuth), `notifications.ts` (T-30/T-10/T-5/T-0 class reminders), `format.ts` (date helpers).
- [x] **components/ui/**: `Screen.tsx`, `Button.tsx`, `Card.tsx`.
- [x] **Routes**: `_layout.tsx` (Query + Auth providers, Stack), `index.tsx` (auth-gated redirect), `(auth)/login.tsx`, `(auth)/change-password.tsx`, `(tabs)/_layout.tsx` (tab bar).

### `apps/web` (Trainer)
- [x] Wired to workspace: `@rubies/shared`, `@tanstack/react-query`; `next.config.ts` `transpilePackages`.

---

## 🚧 Remaining

### `apps/mobile` (Student) — finish the scaffold
- [ ] `(tabs)/dashboard.tsx` — greeting + next-class card (Join CTA) + tiles.
- [ ] `(tabs)/schedule.tsx` — class list (loading / empty / error states).
- [ ] `(tabs)/curriculum.tsx` — progress bar + stage list.
- [ ] `(tabs)/profile.tsx` — profile, change-password, manage Strict Mode, sign out.
- [ ] `class/[id].tsx` — class detail + "Join on Zoom" (logs join, opens deep link, cancels reminders).
- [ ] `strict-mode.tsx` — Strict Mode explainer + passcode + lock-overlay preview.
- [ ] Delete stray template route `app/explore.tsx`.
- [ ] Add `"typecheck": "tsc --noEmit"` script (so root `npm run typecheck` covers it).
- [ ] Wire `setNotificationHandler` + permission request (after first login).

### `apps/web` (Trainer) — not started
- [ ] `app/globals.css` — map tokens (deep purple / orange, fonts) into Tailwind v4 `@theme`.
- [ ] Web `lib/`: api client instance + auth (cookie/localStorage token) + React Query provider.
- [ ] `app/(trainer)/` routes: `login`, `dashboard`, `students`, `curriculum`, `report` (post-class report form → `reports.create`).
- [ ] `app/(admin)/` placeholder note for Person B.
- [ ] Layout metadata + fonts; add `typecheck` script.

### Verification (repo-wide)
- [ ] Run `npm run typecheck` across workspaces and fix fallout.
- [ ] Optional: `npx expo-doctor` in `apps/mobile`.
- [ ] Commit once the scaffold typechecks (only when you ask).

---

## Notes for Person B (backend)
- Implement endpoints exactly as typed in `packages/shared/src/api.ts` / `types.ts`.
- Errors use the `ApiErrorBody` envelope (`{ error: { code, message, details? } }`); `401` triggers client logout.
- Timestamps are ISO-8601 UTC; ids are opaque strings.
- Point the mobile app at the API via `apps/mobile/src/lib/config.ts` (`API_BASE_URL`).
