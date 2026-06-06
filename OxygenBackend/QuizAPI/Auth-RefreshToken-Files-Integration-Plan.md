# QuizAPI — Frontend Refit + Refresh Tokens + Files: Implementation Plan

This plan covers three workstreams that follow the auth/user refactor described in `QuizAPI-Auth-Refactor-Changelog.md`:

1. **Frontend refit** — make the React client match the new many-to-many roles + `ProblemDetails` contract.
2. **Refresh tokens** — add the `RefreshTokens` table and a rotating refresh-token flow delivered via an HttpOnly cookie.
3. **Files** — add a generic `Files` table plus an upload/list/delete endpoint, modeled on the existing `ImageAsset`/`ImageService` pattern.

Decisions locked in for this pass: **plan + implement**, refresh token stored in an **HttpOnly cookie**, and the Files entity ships with a **full upload endpoint**.

---

## Part A — Backend: Refresh Tokens

### A1. New entity `RefreshToken`
`Models/ApplicationUser/RefreshToken.cs`

| Column | Type | Notes |
|---|---|---|
| `Id` | `Guid` | PK |
| `UserId` | `Guid` | FK → `Users.Id`, cascade delete |
| `TokenHash` | `string` | SHA-256 hash of the raw token (raw token never stored) |
| `ExpiresAt` | `DateTime` | UTC; default 7 days out |
| `RevokedAt` | `DateTime?` | set on rotation or logout |
| `CreatedAt` | `DateTime` | UTC |

The raw refresh token is a 256-bit cryptographically random value (base64url). Only its hash is persisted, so a database leak can't be replayed. `IsActive => RevokedAt == null && ExpiresAt > UtcNow`.

### A2. DbContext + migration
- Add `DbSet<RefreshToken> RefreshTokens` to `ApplicationDbContext`.
- Configure FK to `User` with `OnDelete(Cascade)` and a unique index on `TokenHash` in `OnModelCreating`.
- Add EF migration `AddRefreshTokens`.

### A3. Repository
`Repositories/IRefreshTokenRepository.cs` + `RefreshTokenRepository.cs`: `AddAsync`, `GetActiveByHashAsync`, `RevokeAsync`, `RevokeAllForUserAsync`, `SaveChangesAsync`.

### A4. Token service changes
`ITokenService` / `TokenService`:
- Keep `GenerateToken` (access JWT, 1h) unchanged.
- Add `GenerateRefreshToken()` → returns `(string rawToken, string tokenHash, DateTime expiresAt)`.
- Add `Hash(string rawToken)` helper (SHA-256) for lookups on `/refresh`.

### A5. AuthenticationService changes
- `SignupAsync` and `LoginAsync` additionally create + persist a `RefreshToken` row and return the **raw** refresh token to the controller (out param or an enriched result object) so the controller can set the cookie. The JSON body shape (`{ token, user }`) is unchanged — the refresh token travels only in the cookie.
- New `RefreshAsync(string rawRefreshToken)`: hash → look up active token → if invalid/expired/revoked throw `UnauthorizedException` → otherwise **rotate** (revoke old, issue new refresh token) and mint a new access token. Returns new access token + user + new raw refresh token.
- New `LogoutAsync(string rawRefreshToken)`: revoke the matching token (idempotent).

### A6. Controller endpoints
`AuthenticationController`:
- `signup` / `login` — after the service returns, write the raw refresh token into an HttpOnly cookie (`SetRefreshCookie`).
- `POST /api/authentication/refresh` — read cookie, call `RefreshAsync`, set new cookie, return `{ token, user }`. 401 if the cookie is missing or invalid.
- `POST /api/authentication/logout` — `[Authorize]` optional; read cookie, call `LogoutAsync`, clear the cookie. Always returns 204.

Cookie settings: `HttpOnly = true`, `Secure = true`, `SameSite = None`, `Path = "/api/Authentication"`, `Expires = ExpiresAt`. (`SameSite=None`+`Secure` keeps it working cross-origin between the Vite dev server and the API, and is forward-compatible with a cross-site production deploy.)

> CORS already has `.AllowCredentials()` and the frontend axios already sends `withCredentials: true`, so no CORS change is needed beyond confirming the allowed-origins entry is well-formed (see Notes).

---

## Part B — Backend: Files

### B1. New entity `FileRecord`
`Models/FileRecord.cs` (table `Files`)

| Column | Type | Notes |
|---|---|---|
| `Id` | `Guid` | PK |
| `Entity` | `string` | logical owner type, e.g. `"User"`, `"Product"`, `"Document"` |
| `EntityId` | `string` | id of the owner (string to allow Guid or int owners) |
| `Filename` | `string` | original filename |
| `FilePath` | `string` | stored path / key on disk |
| `FileSize` | `long` | bytes |
| `UploadedBy` | `Guid?` | FK → `Users.Id` (the uploader) |
| `CreatedAt` | `DateTime` | UTC |

### B2. DbContext + migration
- Add `DbSet<FileRecord> Files`.
- Add migration `AddFiles`. (No required relationship config needed beyond an optional `UploadedBy` index.)

### B3. Service + repository
`Controllers/Files/Services/IFileService.cs` + `FileService.cs`, modeled on `ImageService`:
- `UploadAsync(IFormFile file, string entity, string entityId, Guid? uploadedBy)` → saves to `wwwroot/uploads/files/{guid}{ext}`, writes a `Files` row, returns a `FileDTO`.
- `GetByEntityAsync(entity, entityId)` → list.
- `DeleteAsync(Guid id)` → remove row + physical file.

### B4. Controller
`Controllers/Files/FilesController.cs` (`[Authorize]`):
- `POST /api/files` (multipart: `file`, `entity`, `entityId`) → upload, uploader pulled from the JWT `sub` claim.
- `GET /api/files?entity=&entityId=` → list.
- `DELETE /api/files/{id}` → delete.

Validation: max size (e.g. 10 MB) and an allowlist of extensions for avatars/product photos/documents.

### B5. DI
Register `IRefreshTokenRepository`, `IFileService`, `IFileRepository` in `Program.cs`.

---

## Part C — Frontend Refit

The client currently assumes one role per user (`user.role`) and an old `Success`-flag response shape. Concrete changes:

### C1. Types — `src/types/user-types.ts`
- `User`: drop `passwordHash`, `immutableName`, single `role`; add `roles: string[]`. Keep `userUpdatedAt` (used by `MyProfile`).

### C2. Authorization — `src/lib/authorization.tsx`
- Rewrite `POLICIES` and `useAuthorization` to use `user.roles.includes(...)` / `roles.some(...)` instead of `user.role === ...`.
- `checkAccess` → `allowedRoles.some(r => user.data.roles.includes(r))`.
- Return `roles` instead of `role`.

### C3. Auth loaders — `src/lib/Auth.tsx`
- `createAuthLoader` role gate: `requiredRoles.some(r => user.roles.includes(r))`.
- Fix `registerWithEmailAndPassword`: it currently `POST`s `/auth/register` with `firstName/lastName/teamId`. Point it at `Authentication/signup` with `{ email, username, password }` and update `registerInputSchema`.
- (Login already reads `{ token, user }` correctly.)

### C4. Other role call sites
- `src/loaders/dashboardEntryLoader.ts` → `roles.includes("Admin") || roles.includes("SuperAdmin")`.
- `src/pages/UserRelated/Profile/MyProfile.tsx` → render `user.roles.join(", ")` (or a Badge per role).
- `src/pages/Dashboard/Pages/User/Components/columns.tsx` → `role` column becomes a `roles` cell joining the array.
- `src/lib/authHelpers.ts` → `requireAdmin` uses `roles.includes('Admin')`.

### C5. Error handling — `src/lib/Api-client.ts`
- The response interceptor reads `error.response.data.message`; the API now returns `ProblemDetails` (`title`/`detail`). Read `data.detail ?? data.title ?? message`.
- Keep the existing 401 branch but hand it to the refresh flow first (C6).

### C6. Refresh-on-401 interceptor — `src/lib/Api-client.ts`
- On a 401 (other than from `/refresh` itself), call `POST Authentication/refresh` once (with `withCredentials`). On success, retry the original request; on failure, clear the access cookie and redirect to login. Use a single-flight guard so concurrent 401s share one refresh call.

### C7. File upload helper (optional UI)
- `src/features/files/api/upload-file.ts`: `multipart/form-data` POST to `/files`; a `useUploadFile` mutation. Wire into avatar/product-photo UIs as needed.

---

## Notes / things to verify on your side
- **`/me` 404 vs null:** `UserService.GetUserByIdAsync` returns `null` rather than throwing `NotFoundException`, so `/me` for a deleted/missing user currently returns `200 null` instead of 404. Minor; covered by the plan only if you want the stricter behavior.
- **`appsettings.json` CORS:** `Cors:AllowedOrigins` is a single string `"https://localhost:5173 , http://localhost:5173"` — that's one malformed origin, not two. Split into proper array entries so credentialed requests from the dev server are allowed.
- **Access-token lifetime:** kept at 1h. Refresh works regardless, but you may want to shorten the access token (e.g. 15m) now that silent refresh exists.
- **Migrations:** run `dotnet ef migrations add AddRefreshTokens` and `AddFiles`, then `dotnet ef database update` (or your existing seeding path).
