# OxygenQuiz — Session Handoff

Paste this into a new chat to bootstrap context.

## Project
- **OxygenQuiz** — a quiz app. Frontend: React + Vite + TypeScript (TanStack Query,
  react-router, Tailwind, shadcn-style UI). Backend: ASP.NET Core + EF Core (Postgres).
- Repo root has `OxygenBackend/QuizAPI` (.NET) and `src/` (frontend).
- Verify frontend with `./node_modules/.bin/tsc --noEmit -p tsconfig.json`.
  NOTE: tsc does NOT catch Babel/Vite transform errors (e.g. a type+value name
  collision) — load the page or `npm run build` to catch those.

## Conventions we settled on
- **Data fetching:** one file per endpoint exposing `getX`, `getXQueryOptions`,
  and a `useXData` hook (TanStack Query). Pagination is header-based for
  questions/quizzes (`extractPaginationFromHeaders`) but body-based for audit logs.
- **Permissions:** granular `resource:action[:own|:any]` model. Backend
  `PermissionService.HasPermissionAsync` / `CanActOnResourceAsync`. Frontend
  `authorization.tsx` mirrors it; **SuperAdmin bypasses all checks** (frontend and
  intended backend). `/me` and login responses include a flat `permissions[]`.
- **Two dashboards:** admin `/dashboard/*` (adminAuthLoader) and user
  `/my-dashboard/*` (userAuthLoader). User pages use self-scoped endpoints
  (`/questions/myQuestions`, `/quiz/my`).
- **Settings:** per-user `UserSettings` entity, `GET/PUT /api/settings`. Applied
  app-wide by `src/common/SettingsApplier.tsx` (theme, looped background music,
  fonts). Fonts resolve through CSS variables (`--font-app`, `--font-quiz`) so a
  setting re-fonts everything via Tailwind `app`/`quiz` families; curated list in
  `src/lib/fonts.ts`, loaded in `index.html`.
- **Audit logging:** `IAuditService.LogAsync` (never throws, call AFTER save),
  verbs from `Services/Audit/AuditActions.cs`. Admin-only Audit Log page with
  filters + manual Refresh. Docs in `docs/development/audit-logging.md`.

## What was built this session
- User settings (theme, music/SFX + volume, show timer, app/quiz fonts) + settings page.
- User-selectable fonts per zone (dashboard vs quiz), sync-fonts toggle, value
  normalization for old rows; ModeToggle unified with saved settings.
- Audit logging instrumented on question/quiz/role/user mutations + admin Audit Log page.
- ProfileView split into presentational + `MyProfile` (self) container; scaffolded
  public profile (`/users/:userId`, `GET /api/users/{id}/profile`, `PublicUserProfileDTO`).
- Fixes: RolePermission & UserRole inverse navs (removed shadow `RoleId1` keys);
  `myQuestions` returns typed DTOs; user-dashboard caches invalidated on mutations.

## OPEN LOOSE ENDS (do these / keep in mind)
1. **Run pending EF migrations** after pulling: settings table, font columns
   (`AppFont`/`QuizFont`), and the `RoleId1` shadow-key drops on `RolePermission`
   AND `UserRole`. (No DB drop needed — incremental migrations only.)
2. **Drop an audio file** at `public/audio/background-music.mp3` (music is silent until then).
3. **Dormant scaffolds (intentionally unlinked):** `/users/:userId` public profile
   and `GET /api/users/{id}/profile`. Nothing links to them yet.
4. **Security gaps — partly fixed:**
   - ✅ `RolesController` is now `[Authorize(Roles = "SuperAdmin")]` (was fully anonymous).
   - ✅ `ImageUploadController` is now `[Authorize]` (was anonymous upload).
   - ✅ `UsersController`: list-all + create are now `[Authorize(Roles = "Admin,SuperAdmin")]`;
     update/delete now require **self-or-admin** (closed the cross-user IDOR).
   - ✅ DataTransfer `*/export` endpoints are now `[Authorize(Roles = "SuperAdmin, Admin")]`
     (matching the imports; `questions/export` was leaking answer keys).
   - ⚠️ Still open: `GET /api/users/{id}`, `GET /api/users/username/{username}`, and
     `POST /api/users/batch` return the full `UserDTO` (incl. email) with no auth. Left as-is
     because the frontend may read them anonymously; revisit (slim DTO or auth) before launch.
5. **Minor:** font "sync" state is inferred (`appFont === quizFont`), not stored;
   question *update* hooks now refetch but consider consistency; audit Actor column
   shows raw userId (no username resolution).

## Possible next steps we discussed
- Lock down the remaining public-user read endpoints (see gap ⚠️ above); RolesController is done.
- Make the public profile live (link to it; add public-by-id count endpoints; decide auth).
- Optional `refetchInterval` (focus-only) on the audit page for near-live updates.
- Resolve usernames in the audit log; expandable old/new detail view.
