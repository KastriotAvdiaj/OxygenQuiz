# Google & Microsoft Sign-In (External Identity Providers)

> **What it does:** Lets people sign in — and, while the app is invite-only, sign *up* — with a
> Google or Microsoft account. The provider only replaces the password check: once the identity
> is proven, the existing session machinery (access JWT + rotating refresh cookie, roles,
> auditing) runs unchanged. During gated signup the invite code always comes **first**; no
> signup method, manual or external, is reachable before a valid code.

This document describes the system **as implemented**. For the design rationale and trade-offs,
see [social-login-plan.md](social-login-plan.md). Implemented 2026-07-26.

> **One deviation from the plan:** the Google verifier does not use the `Google.Apis.Auth`
> package. Both providers are verified with the same `Microsoft.IdentityModel` OIDC stack the
> JWT middleware already depends on — one mechanism, **zero new backend packages**.

---

## 1. How it works at a glance

1. The frontend gets an **ID token** from the provider's own popup (Google Identity Services /
   MSAL). We never see the user's provider password.
2. `POST /api/Authentication/external-login { provider, idToken }`. The backend verifies the
   token against the provider's published keys (issuer, audience, signature, expiry), then:
   - **Known identity** (`ExternalLogins` row for this `(provider, sub)`) → normal login.
   - **Provider-verified email matching an existing account** → link the identity to it, login.
     (Unverified email matching an account → 409, "log in with your password" — an unverified
     claim must never take over an account.)
   - **Nobody home** → `{ requiresSignup: true, signupTicket, email, suggestedUsername }`.
     No session yet.
3. To finish a first-time signup: `POST /api/Authentication/external-signup { signupTicket,
   username, inviteCode? }`. Same transactional semantics as password signup — user + identity
   link + consumed invite code commit together or not at all.
4. Both endpoints mint the usual access token + refresh cookie via `BuildAuthResultAsync`; the
   provider token is discarded, never stored.

The **signup ticket** is a 10-minute JWT signed with our own `Jwt:Key` but addressed to a
dedicated audience (`oxygenquiz:external-signup`), carrying the verified `{provider, sub,
email, emailVerified}`. The audience split means the JWT middleware structurally rejects a
ticket on any `[Authorize]` endpoint, and ticket validation rejects real access tokens.

---

## 2. Data model

**`Models/ApplicationUser/ExternalLogin.cs`** — table `ExternalLogins`
(migration `AddExternalLogins`):

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` (identity) | PK |
| `UserId` | `Guid` | FK → `User`, cascade delete |
| `Provider` | `string(32)` | `"google"` / `"microsoft"` (lowercase) |
| `ProviderSubjectId` | `string(128)` | The ID token's `sub` — the provider's permanent account id |
| `Email` | `string(256)?` | As asserted at link time; audit only, never used for lookups |
| `CreatedAt` | `DateTime` | UTC |

Unique index on `(Provider, ProviderSubjectId)`; identity is **never** resolved by email after
linking (emails change and get recycled; `sub` doesn't).

**`User.PasswordHash` is now nullable.** External-only accounts have no password. `LoginAsync`
fails a null/empty hash with the same generic "Invalid credentials." as a wrong password (before
reaching `BCrypt.Verify`, which throws on malformed hashes) — a distinct message would let
anyone probe which emails are external-only.

---

## 3. Token verification

`Services/AuthenticationService/External/` — `IExternalIdentityVerifier` (one per provider,
singletons so the JWKS metadata cache is shared), returning an `ExternalIdentity` record
`{ Provider, SubjectId, Email, EmailVerified, DisplayName }`:

- **`GoogleIdentityVerifier`** — OIDC metadata from `accounts.google.com`; issuer either Google
  form; audience = `Authentication:Google:ClientId`; `EmailVerified` from `email_verified`.
- **`MicrosoftIdentityVerifier`** — metadata from
  `login.microsoftonline.com/{TenantId}/v2.0`; issuer validated structurally (must match the
  token's own `tid`, pinned to the configured tenant unless `common`/`organizations`).
  **Email trust is stricter:** Entra's `email` claim isn't guaranteed verified, so
  `EmailVerified` is true only for personal accounts (the `consumers` tenant, where the email
  *is* the login) or when the `xms_edov` optional claim vouches for it.

Verification failures throw `UnauthorizedException` (→ 401) and audit `LoginFailed` with the
provider name. A provider that is unknown or disabled in config is a 400 before any
verification.

---

## 4. Endpoints

All on `Controllers/Authentication/Authentication.cs`, anonymous + `AuthPolicy` rate limit
(they are credential surfaces):

| Endpoint | Body → Result |
|---|---|
| `GET /api/Authentication/auth-config` | → `{ requireInviteCode, providers: { google: { enabled, clientId }, microsoft: { … } } }`. Client ids are public; withheld while disabled. Supersedes `signup-config` (kept for compat). |
| `POST /api/Authentication/external-login` | `{ provider, idToken }` → `AuthResponseDTO` + refresh cookie, **or** `ExternalSignupRequiredDTO` (no cookie), or 401/409. |
| `POST /api/Authentication/external-signup` | `{ signupTicket, username, inviteCode? }` → `AuthResponseDTO` + refresh cookie. 401 for a bad/expired ticket, 400 for a bad invite code, 409 for username/email/identity races. |

Service logic: `AuthenticationService.ExternalLoginAsync` / `ExternalSignupAsync`. External
signup re-runs every guard inside its transaction window (identity not yet linked, email free,
username free, atomic `TryConsumeAsync` with rollback on 0 rows) — the ticket's 10-minute
lifetime is a race window like any other. New users get `EmailConfirmed` = the provider's
verdict; unverified emails go through the normal verification-email flow.

Auditing: `UserLoggedIn` / `LoginFailed` / `UserSignedUp` (each with `{ provider }`),
`InviteCodeRedeemed` as before, and the new **`ExternalAccountLinked`** whenever a provider
identity is attached to a user (auto-link or signup).

---

## 5. Frontend — the invite-first signup flow

`src/pages/UserRelated/Signup/SignupComponents/SignupFlow.tsx` is a four-stage machine:

```
gate ON:   invite ──► method ──► manual (email/password, steps 2..5)
                            └──► external (username only, "Step 2 of 2")
gate OFF:  method ──► manual (steps 1..4) | external
```

- **`InviteGate.tsx`** — the whole first screen while gated: the invite-only note, ONE input,
  Continue. The header says just **"Step 1"** — no progress dots, since the number of remaining
  steps depends on the method not yet chosen. Continue is gated on the advisory
  `useInviteCodeValidity` check (unreachable check never hard-blocks; the server stays the
  authority). Provider buttons do **not** exist on this screen.
- **`MethodChoice.tsx`** — after a valid code: "Continue with email" or the provider buttons
  (`SocialButtons`), plus "Use a different invite code". Renders providers only when enabled in
  `auth-config`.
- **`SignupForm.tsx`** — the existing multi-step form, minus its old invite step. It receives
  the gate's code as a prop, numbers itself `Step 2 of 5` when gated (`1 of 4` open), sends the
  code on submit, and bounces to the gate via `onBadInviteCode` if the server rejects it.
- **`ExternalSignupForm.tsx`** — provider signup completion: shows which account is being used,
  collects a username (live availability), submits ticket + username + code. 401 = expired
  ticket → friendly message, back to method choice; bad code → back to the gate.
- Stage transitions re-mount a wrapper keyed by stage with `animate-in fade-in
  slide-in-from-bottom-4` (tailwindcss-animate) — the "next page slides up" effect.
- A provider attempt on the **login page** that finds no account forwards its ticket to
  `/signup` via router state — the user still passes the invite gate, but doesn't redo the
  popup.

Supporting pieces: `src/lib/auth-config.ts` (`useAuthConfig`, replaces the deleted
`signup-config.ts`), `src/lib/Auth.tsx` (`useExternalLogin` / `useExternalSignup` mutations —
they adopt the session exactly like `loginFn` and write the react-query-auth user cache),
`src/lib/SocialButtons/` (real buttons now: official GIS button for Google — required for the
ID-token flow — and an app-styled MSAL popup button for Microsoft, `msal.ts` holding the lazy
MSAL singleton with in-memory cache only).

New deps: `@react-oauth/google`, `@azure/msal-browser` — **run `npm install`**.

---

## 6. Configuration & provider setup

`appsettings.json` (all non-secret — this flow uses **no client secrets**):

```json
"Authentication": {
  "Google":    { "Enabled": false, "ClientId": "" },
  "Microsoft": { "Enabled": false, "ClientId": "", "TenantId": "consumers" }
}
```

Enable per environment (`Authentication__Google__Enabled=true`, …). Startup fails fast if a
provider is enabled without a client id. Frontend buttons appear/disappear automatically via
`auth-config`.

**One-time console setup:**
- **Google Cloud Console** → OAuth consent screen → Credentials → OAuth client ID (type **Web
  application**) → add the frontend origins (`https://localhost:5173`, prod domain) to
  *Authorized JavaScript origins*. No redirect URI needed for the popup flow.
- **Microsoft Entra admin center** → App registration → supported account types **Personal
  Microsoft accounts** (matches `TenantId: consumers`) → platform **Single-page application**
  with the frontend origins as redirect URIs → *Token configuration*: add optional claims
  **`email`** and **`xms_edov`** to the ID token.

To apply the schema change: `dotnet ef database update` (migration `AddExternalLogins`).
After pulling these changes, also run `graphify update .` to refresh the code graph.

---

## 7. Tests

`QuizAPI.Tests/Auth/ExternalAuthenticationTests.cs` (verifier mocked — we test our decisions
after "identity proven", not the provider's crypto):

- login-or-link resolution: known identity logs in creating nothing; verified email links +
  audits; unverified email over an existing account → 409 and links nothing; no match → ticket,
  no session, no rows.
- provider gating: unknown provider and disabled provider both rejected; bad token → 401 +
  `LoginFailed` audit.
- external signup: happy path creates user (null `PasswordHash`, `EmailConfirmed` true) + link +
  consumes the code exactly once; lost consume race rolls back with zero side effects; flag off
  never touches the invite repo; unverified email → unconfirmed user + verification email;
  invalid ticket / already-linked identity rejected.
- `ExternalSignupTicketTests` runs against the **real** `TokenService`: round-trip integrity,
  tamper rejection, garbage rejection, and — the critical boundary — **an access token presented
  as a ticket is rejected** (audience split).

Frontend: `tsc -b` clean; no component tests existed for the signup flow before and none were
added (Storybook stories for the new stages would be a nice follow-up).

---

## 8. Going live — remaining steps

The code is complete and tested; everything left is configuration. Until step 3 is done the
provider buttons simply don't render (the flow behaves exactly as before this feature).

1. **`npm install`** — pulls `@react-oauth/google` and `@azure/msal-browser`. ✅ if the dev
   server already starts clean.
2. **`dotnet ef database update`** — applies `AddExternalLogins` (new table + nullable
   `PasswordHash`). Run against each environment's database before deploying the new API.
3. **Google Cloud Console** (≈10 min): OAuth consent screen (External, app name + logo) →
   Credentials → *Create OAuth client ID* → type **Web application** → add `https://localhost:5173`
   and the production frontend origin to **Authorized JavaScript origins** (no redirect URI
   needed). Copy the client id into config and enable:
   - dev: `appsettings.Development.json` → `"Authentication": { "Google": { "Enabled": true, "ClientId": "…" } }`
   - prod: `Authentication__Google__Enabled=true`, `Authentication__Google__ClientId=…`
4. **Microsoft Entra** (optional — see below): App registration → account type **Personal
   Microsoft accounts** → platform **Single-page application** with both frontend origins as
   redirect URIs → Token configuration: optional claims `email` + `xms_edov` → enable via the
   matching `Authentication__Microsoft__*` settings.
5. **`graphify update .`** — refresh the code graph after pulling these changes.
6. **Manual test pass** (dev, `Signup__RequireInviteCode=true`):
   - New Google account → invite gate → provider button → username step → logged in;
     `ExternalLogins` row exists; `Users.PasswordHash` NULL; `EmailConfirmed` true; no
     verification email sent.
   - Same Google account again → logs straight in (no signup step, no invite consumed).
   - Google account whose email matches an existing password account → logs in; row added to
     `ExternalLogins`; `ExternalAccountLinked` audit row.
   - External-only account tries the password form → generic "Invalid credentials."
   - Wait >10 min on the username step → submit → "Signup session expired" → back to method
     choice.
   - Bad/spent invite code at submit → bounced to the invite gate.
7. **Production deploy order:** DB migration → API → frontend. The old frontend against the
   new API is fine (new endpoints unused); the new frontend against the old API is also fine
   (auth-config 404s → buttons hidden).

### Google-only launch?

Fine, and zero code change: just leave `Authentication:Microsoft:Enabled` at `false`. The
frontend hides the Microsoft button automatically. The Microsoft path is built and tested, so
enabling it later is purely the Entra console setup + two settings. Recommendation: start with
Google (by far the most common consumer identity), add Microsoft when there's demand — the
main real cost of Microsoft is maintaining a second provider console, not code.

### Troubleshooting: a storm of "Too many requests" toasts (seen 2026-07-26)

Cause, two layers: the auth rate limit (`AuthPolicy`, 10/min/IP — guards login, signup,
refresh, **validate-invite-code**) returns a 429 whose body sets `isCustomMessage`, so the
axios interceptor toasted it; and the advisory calls (invite validity, username/email
availability) didn't set `skipErrorToast`, so every rate-limited background call fired its own
toast. In dev, Vite HMR remounts refetch those queries, which both trips the limiter and
multiplies the toasts. Fixed twice over: the notifications store now **drops a toast identical
to one already visible** (`Notifications-store.ts`), and all advisory calls are
`skipErrorToast` (their failure is already shown inline, and they never hard-block). If a 429
storm reappears, it's one toast, the limiter resets within a minute, and nothing is broken —
the server-side checks remain authoritative.

---

## 9. File map

**Backend — new:** `Models/ApplicationUser/ExternalLogin.cs` ·
`Repositories/{Interfaces/IExternalLoginRepository,ExternalLoginRepository}.cs` ·
`Services/AuthenticationService/External/{ExternalIdentity,IExternalIdentityVerifier,GoogleIdentityVerifier,MicrosoftIdentityVerifier}.cs` ·
`DTOs/Authentication/ExternalAuthDTOs.cs` · `Migrations/*_AddExternalLogins.cs`

**Backend — edited:** `Data/ApplicationDbContext.cs` · `Models/ApplicationUser/User.cs`
(nullable `PasswordHash`) · `Services/AuthenticationService/{IAuthenticationService,
AuthenticationService,ITokenService,TokenService}.cs` ·
`Controllers/Authentication/Authentication.cs` · `Services/Audit/AuditActions.cs` ·
`Program.cs` · `appsettings.json` / `appsettings.example.json`

**Frontend — new:** `src/lib/auth-config.ts` · `src/lib/SocialButtons/msal.ts` ·
`Signup/SignupComponents/{SignupFlow,InviteGate,MethodChoice,ExternalSignupForm}.tsx`

**Frontend — edited:** `src/lib/Auth.tsx` · `src/lib/SocialButtons/SocialButtons.tsx` (was
decorative, now real) · `Signup/{Signup.tsx,SignupComponents/{SignupForm,SignupSteps}.tsx}` ·
`Login/Login.tsx` · `package.json`. **Deleted:** `Signup/api/signup-config.ts`.

**Tests:** `QuizAPI.Tests/Auth/ExternalAuthenticationTests.cs` (+ updated
`AuthenticationServiceTests.cs` constructor wiring).
