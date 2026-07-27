# Implementation Plan — Google & Microsoft Sign-In (External Identity Providers)

> **Status: implemented (2026-07-26).** This is the original design plan, kept for the rationale
> and trade-offs behind the decisions. For the system **as built** — actual files, endpoints,
> config, and provider console setup — see [`social-login.md`](social-login.md). One deviation:
> both verifiers use the Microsoft.IdentityModel OIDC stack (no `Google.Apis.Auth` package —
> zero new backend dependencies).

> **Goal:** Let people sign in (and, while the app is invite-only, sign *up* with a valid invite
> code) using their Google or Microsoft account, without weakening the existing token scheme or the
> invite gate. After the provider proves who the user is, everything else — access JWT, rotating
> refresh cookie, roles, auditing — stays exactly as it is today.

This plan is written to match the existing codebase conventions:
- **The two-token scheme is untouched.** External login is only a new way to *prove identity*;
  session issuance still goes through `BuildAuthResultAsync` → access JWT + rotated refresh cookie
  (see [`authentication.md`](authentication.md)).
- **The invite gate stays authoritative.** A first-time external signup consumes an invite code
  through the same transactional `TryConsumeAsync` path as password signup.
- **New entity + thin repository** (`ExternalLogin`, `IExternalLoginRepository`) mirror
  `RefreshToken` / `InviteCode`, registered `Scoped` in `Program.cs`.
- **Provider verification is behind an interface** so Google and Microsoft are peers and a third
  provider is one class away.

---

## 1. The approach: backend ID-token verification (and why)

There are two standard ways to do "Sign in with Google/Microsoft":

**A. Server-side redirect flow** (ASP.NET Core `AddGoogle()` / `AddMicrosoftAccount()`): the
browser is redirected to the provider, back to an API callback, and the handshake state lives in a
temporary server cookie. This is built for cookie-authenticated server-rendered apps. Our app is a
SPA using bearer tokens; grafting the redirect flow on means an external cookie scheme, callback
endpoints, and correlation cookies that fight our CORS/SameSite setup.

**B. ID-token verification (chosen):**

1. The frontend uses the provider's official JS library (Google Identity Services, MSAL) to open
   the provider's own popup. The user authenticates **on the provider's page** — we never see the
   password.
2. The library hands the SPA an **ID token**: a JWT *signed by the provider* asserting "this is
   subject `sub`, email `e`, verified: yes/no", with our app's **client ID as the audience**.
3. The SPA POSTs that ID token to our API once. The backend **verifies the signature against the
   provider's published public keys (JWKS)** plus issuer, audience, and expiry — exactly the same
   kind of validation our own JWT middleware already does, just with the provider's keys.
4. If it checks out, the backend looks up/creates/links the local user and mints **our own**
   access + refresh tokens. From that moment the session is indistinguishable from a password
   login; the provider token is discarded, never stored.

Why B fits us: no redirect state on the server, no changes to the SPA session model, and — a real
operational win — **no client secrets**. The ID-token flow needs only public client IDs, so there
is nothing new to put in user-secrets or environment variables.

The mental model: Google/Microsoft replace only the *"BCrypt.Verify"* step of login. Everything
after "identity proven" is existing code.

---

## 2. Design decisions (and why)

**2.1 Identify by provider subject (`sub`), never by email.**
The `(provider, sub)` pair is the provider's permanent, unique account ID. Emails can change or be
recycled; `sub` cannot. The `ExternalLogins` table keys on `(Provider, ProviderSubjectId)` with a
unique index. Email is used **only once**, at first contact, for account linking (2.3).

**2.2 Invite gate applies to first-time external signups.**
An external login that matches no local account is **not** silently turned into a new user. The API
responds "signup required" and the frontend collects a username and — while
`Signup:RequireInviteCode` is on — an invite code. The external signup then runs the same
*create-user + atomically-consume-code in one transaction* logic as password signup, so the cap
can never be exceeded through the OAuth door. Existing accounts sign in freely; the gate only
guards *account creation*, same as today.

**2.3 Auto-link on verified email only.**
If the provider asserts a **verified** email that matches an existing local account, we link the
external identity to it and log the user in — standard practice, and what users expect. If the
provider *cannot* assert verification (see 2.4), we reject with a clear "this email already has an
account — log in with your password" message rather than risk an account takeover via an
unverified email claim. Linking is audited.

**2.4 Trust Google's `email_verified`; be stricter with Microsoft.**
Google ID tokens carry a reliable `email_verified` claim. Microsoft Entra tokens are subtler: the
`email` claim can be user-mutable and is **not** guaranteed verified. Mitigation: request the
`email` scope and configure the **`xms_edov`** ("email domain owner verified") optional claim in
the app registration; treat a Microsoft email as verified only when `xms_edov` is true (personal
Microsoft accounts, where the email *is* the login, satisfy this). When not verified: existing
account with that email → explicit-link rejection (2.3); no existing account → signup may proceed,
but the new user gets `EmailConfirmed = false` and the normal verification email (the flow already
exists).

**2.5 External-only accounts have no password — make that explicit.**
`User.PasswordHash` becomes **nullable** (migration `MakePasswordHashNullable`). `LoginAsync` gains
a guard: a null/empty hash fails with the same generic `"Invalid credentials."` as a wrong
password. (Generic on purpose — a distinct message would let anyone probe which emails are
OAuth-only accounts. The trade-off is a slightly less helpful error; the login page can carry a
static "signed up with Google/Microsoft? use those buttons" hint instead. Note: today
`BCrypt.Verify` would *throw* on an empty stored hash rather than return false, so this guard is
required, not cosmetic.) A future "set a password" feature in account settings is out of scope
(§10).

**2.6 A short-lived signup ticket bridges the two-step signup.**
When external login says "signup required", the username/invite step is a second round-trip. The
backend must not blindly trust a `{ sub, email }` the client sends back, and re-sending the raw
provider token is awkward (it may expire mid-form). Instead the first response includes a
**signup ticket**: a 10-minute JWT minted by our own `TokenService` signing key with a dedicated
`purpose: "external_signup"` claim carrying `{ provider, sub, email, emailVerified }`. The
external-signup endpoint accepts only this ticket. Tamper-proof, self-expiring, no server state —
consistent with how this codebase already treats short-lived bearer secrets. The JWT middleware
never accepts it as an access token (the purpose claim is checked only by the signup endpoint, and
`[Authorize]` endpoints require role/`sub` claims a ticket lacks — verify this in tests).

**2.7 Both new endpoints sit behind `AuthPolicy` rate limiting** — same strict per-IP policy as
login/signup/refresh: they are anonymous credential surfaces.

**2.8 Feature flags per provider.**
`Authentication:Google:Enabled` / `Authentication:Microsoft:Enabled` (plus the client IDs). The
frontend reads them from a public config endpoint (§6) so buttons appear only for configured
providers — mirroring how `signup-config` already drives the invite field. A provider can be
turned off instantly without a frontend deploy.

---

## 3. Data model

**`Models/ApplicationUser/ExternalLogin.cs`** — table `ExternalLogins`
(migration `AddExternalLogins`):

| Field | Type | Notes |
|---|---|---|
| `Id` | `int` (identity) | PK |
| `UserId` | `Guid` | FK → `User`, `OnDelete(Cascade)` — an identity link is meaningless without its user |
| `Provider` | `string(32)` | `"google"` \| `"microsoft"` (lowercase, normalized) |
| `ProviderSubjectId` | `string(128)` | The provider's `sub` claim |
| `Email` | `string(256)?` | Email as asserted at link time — audit/debug only, **never used for lookups after linking** |
| `CreatedAt` | `DateTime` | UTC |

Indexes: **unique** on `(Provider, ProviderSubjectId)`; non-unique on `UserId` (a user may link
both providers).

**`User` change:** `PasswordHash` → `string?` (see 2.5). No other user columns change; roles,
settings, sessions all work unchanged because external users are ordinary `User` rows.

---

## 4. Provider verification layer

**`Services/AuthenticationService/External/`**

- `ExternalIdentity` (record): `Provider`, `SubjectId`, `Email?`, `EmailVerified`, `DisplayName?`.
- `IExternalIdentityVerifier`: `string Provider { get; }` +
  `Task<ExternalIdentity> VerifyAsync(string idToken, CancellationToken ct)` — throws
  `UnauthorizedException` on any validation failure.
- **`GoogleIdentityVerifier`** — uses the official `Google.Apis.Auth` package:
  `GoogleJsonWebSignature.ValidateAsync(idToken, settings with Audience = ClientId)`. The library
  handles JWKS fetching/caching, issuer (`accounts.google.com` / `https://accounts.google.com`),
  expiry, and signature. Maps `Payload.Subject/Email/EmailVerified/Name`.
- **`MicrosoftIdentityVerifier`** — uses `Microsoft.IdentityModel.Protocols.OpenIdConnect`: a
  cached `ConfigurationManager<OpenIdConnectConfiguration>` over
  `https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration` supplies the
  signing keys to `JwtSecurityTokenHandler.ValidateToken`. Tenant comes from
  `Authentication:Microsoft:TenantId` — `"consumers"` if only personal Microsoft accounts are
  wanted (fixed issuer, simplest), `"common"` to also accept org accounts (issuer is then
  per-tenant, `https://login.microsoftonline.com/{tid}/v2.0`, validated by template rather than
  exact match). Start with `consumers`; widen later if org sign-in is ever needed. Reads `sub`,
  `email`, `xms_edov` (2.4), `name`.

Both are stateless → registered as **singletons**, resolved by provider name (a keyed service or a
simple `IEnumerable<IExternalIdentityVerifier>` lookup).

---

## 5. Backend flow

### 5.1 `POST /api/Authentication/external-login` — `[AllowAnonymous]`, `AuthPolicy`

Body: `{ provider: "google" | "microsoft", idToken: string }`.

`AuthenticationService.ExternalLoginAsync`:

1. Resolve the verifier for `provider` (unknown/disabled provider → 400). Verify the ID token →
   `ExternalIdentity`; failure → 401 + `LoginFailed` audit.
2. **Known identity?** `GetByProviderSubjectAsync(provider, sub)` → if found, load the user,
   update `LastLogin`, audit `UserLoggedIn`, return `BuildAuthResultAsync` (sets refresh cookie in
   the controller, same as login today).
3. **Auto-link?** Else, if `EmailVerified` and a local account exists with that email: create the
   `ExternalLogin` row, audit `ExternalAccountLinked`, log them in as above.
   - If an account exists but the email is **not** provider-verified → 409
     `"An account with this email already exists. Log in with your password to use it."`
4. **New user →** mint the signup ticket (2.6) and return
   `200 { requiresSignup: true, signupTicket, email, suggestedUsername }`
   (`suggestedUsername` derived from the provider display name / email local part — a convenience
   prefill only; availability is checked as usual). No cookie is set on this branch.

### 5.2 `POST /api/Authentication/external-signup` — `[AllowAnonymous]`, `AuthPolicy`

Body: `{ signupTicket: string, username: string, inviteCode?: string }`.

`AuthenticationService.ExternalSignupAsync` — deliberately parallel to `SignupAsync`:

1. Validate the ticket (signature, expiry, `purpose` claim) → recover `{ provider, sub, email,
   emailVerified }`. Invalid/expired → 401.
2. Invite gate, same as password signup: flag on → require + early-validate the code.
3. Guards: email not in use (a *race* since the ticket was minted — recheck), username free,
   default role present. Also recheck `(provider, sub)` isn't linked yet (double-submit).
4. **Transaction:** create the `User` (`PasswordHash = null`,
   `EmailConfirmed = emailVerified`, default `User` role) **and** the `ExternalLogin` row; flag on
   → `TryConsumeAsync(codeHash, user.Id)`, `0 rows → rollback` — identical semantics to
   `SignupAsync` step 5. Commit.
5. Post-commit side effects: welcome notification; `UserSignedUp` + `ExternalAccountLinked`
   (+ `InviteCodeRedeemed` when gated) audits; **only if `emailVerified` is false**, the
   verification email (verified emails skip the whole flow — that's a UX win of OAuth signup).
6. Return `BuildAuthResultAsync` → controller sets the refresh cookie. Logged in.

### 5.3 Config endpoint

Extend the existing pattern with `GET /api/Authentication/auth-config` (anonymous):

```json
{
  "requireInviteCode": true,
  "providers": {
    "google":    { "enabled": true, "clientId": "xxx.apps.googleusercontent.com" },
    "microsoft": { "enabled": true, "clientId": "<app-registration-client-id>" }
  }
}
```

Client IDs are public by design (they ship in the JS anyway). Either fold `signup-config` into
this or keep both — folding is cleaner; keep `signup-config` returning the same shape for
backwards compat until the frontend migrates.

---

## 6. Frontend

New deps: `@react-oauth/google` (official Google Identity Services wrapper) and
`@azure/msal-browser` (Microsoft). Both return the ID token from a popup — no redirects, SPA state
survives.

- **`src/lib/Auth.tsx`** — `externalLoginFn(provider, idToken)` posts to `external-login`; on
  `{ token, user }` it stores the token (`setAccessToken`) and seeds the user cache exactly like
  `loginFn`; on `{ requiresSignup }` it routes to the completion step carrying the ticket. New
  `externalSignupFn` mirrors `registerFn`. Zod schemas for both payloads.
- **`src/pages/UserRelated/Login/LoginForm.tsx` / `Login.tsx`** — an "or continue with" divider
  plus Google and Microsoft buttons, rendered only for providers enabled in `auth-config`
  (fetched via a `useAuthConfig()` hook following `useSignupConfig()`'s pattern, including its
  "default-off-until-resolved" resilience). If external login answers `requiresSignup`, the user
  is sent to the signup flow (which, while gated, starts at the invite step).
- **`src/pages/UserRelated/Signup/`** — **the invite gate comes first, before any signup method
  is offered.** While `requireInviteCode` is on, the signup page shows a single deliberately
  minimal screen: the "invite only" explainer, one invite-code input, and a Continue button. The
  step header reads just "Step 1" with **no step-count visuals** (the dots/progress row is
  hidden) — the user can't be told "step 1 of N" when N depends on a choice they haven't made
  yet, and a lone input reads cleaner without a progress bar. Continue is gated on
  `useInviteCodeValidity` exactly as today. Only after a valid code does the page **animate to
  the method-choice screen**: continue manually (the existing multi-step form, minus its invite
  step) or with Google/Microsoft. The provider buttons are *not rendered* before the gate is
  passed — sign-in-with-Google before entering a code would let the flow start without an
  invite. When the gate is off, the method choice (form + provider buttons) is simply the first
  screen.
  A new **`ExternalSignupForm`** handles a provider signup after the popup: a username step
  (reusing the existing availability hook), submitting `{ signupTicket, username, inviteCode }`.
  A server-side bad-code error returns the user to the invite screen, same bounce-back
  convention as `SignupForm`. The ticket lives in component state — its 10-minute expiry means
  an expired ticket just restarts the provider popup (with a friendly message).
- The decorative `SocialButtons` component (`src/lib/SocialButtons/`) currently rendered
  unconditionally at the bottom of Login/Signup becomes the real, wired implementation — and on
  the signup page it moves *behind* the invite gate as part of the method-choice screen.
- **Google button nuance:** GIS renders its own button; MSAL popups must be triggered from a user
  gesture. Both constraints are satisfied by plain button handlers — no auto-prompt / One Tap in
  v1 (it complicates consent UX for little gain).

---

## 7. Configuration

`appsettings.json` (all non-secret — **no client secrets exist in this flow**):

```json
"Authentication": {
  "Google":    { "Enabled": false, "ClientId": "" },
  "Microsoft": { "Enabled": false, "ClientId": "", "TenantId": "consumers" }
}
```

Per-environment override via env vars (`Authentication__Google__Enabled=true`, …). Document in
`appsettings.example.json` alongside the existing keys. Startup validation: an *enabled* provider
with a blank `ClientId` fails fast, matching the `Jwt:Key` convention.

**Provider console setup (one-time, manual):**
- **Google Cloud Console** → OAuth consent screen (External) → Credentials → *OAuth client ID*,
  type **Web application**; add the frontend origins (`https://localhost:5173`, production domain)
  to *Authorized JavaScript origins*. No redirect URI is needed for the GIS popup flow.
- **Microsoft Entra admin center** → App registration; supported account types **Personal
  Microsoft accounts** (matching `TenantId: consumers`; choose "…and any org directory" if
  widening later); platform **Single-page application** with the frontend origins as redirect
  URIs (MSAL popup requires them); *Token configuration* → add optional claims **`email`** and
  **`xms_edov`** to the ID token; API permissions: `openid`, `email`, `profile`.

---

## 8. Auditing

New verbs in `AuditActions`: `ExternalAccountLinked` (link created — at auto-link or external
signup, logged with the user id and provider). Reuse the existing `UserLoggedIn`, `LoginFailed`
(failed token verification, with `{ provider }`), `UserSignedUp`, `InviteCodeRedeemed`.

---

## 9. Tests

`QuizAPI.Tests/Auth/ExternalAuthenticationTests.cs`, mocking `IExternalIdentityVerifier` (the
real verifiers are thin wrappers over provider libraries; don't unit-test Google's crypto):

- Known `(provider, sub)` → logs in, no new rows, `LastLogin` bumped.
- Unknown sub + **verified** matching email → links + logs in, `ExternalAccountLinked` audited.
- Unknown sub + **unverified** matching email → 409, nothing written.
- Unknown sub + no matching account → `requiresSignup` + ticket; **no cookie, no user row**.
- External signup: valid ticket + flag on + valid code → user (null `PasswordHash`,
  `EmailConfirmed` per ticket) + link + code consumed once; lost race (`TryConsumeAsync` → 0) →
  rollback, **no side effects**; flag off → invite repo untouched.
- Ticket abuse: expired ticket → 401; access-token-as-ticket (wrong `purpose`) → 401; **ticket
  used as an access token against an `[Authorize]` endpoint → 401** (2.6).
- `LoginAsync` guard: null-`PasswordHash` user + any password → generic 401, no BCrypt throw.

---

## 10. Explicitly out of scope (future work)

- **Account settings: view/unlink providers, set a password** for external-only accounts
  (unlink must be blocked while it's the account's only credential).
- **Org (Entra tenant) sign-in** — start `consumers`-only; widening is a config + issuer-validation
  change (§4).
- **One Tap / auto-prompt**, and additional providers (the verifier interface makes each a
  self-contained addition).
- **Nonce round-trip** for provider tokens (defense-in-depth against replay within the token's
  ~1h validity; both libraries support it — add if wanted later).

---

## 11. File map (planned)

**Backend — new**
- `Models/ApplicationUser/ExternalLogin.cs`
- `Repositories/Interfaces/IExternalLoginRepository.cs`, `Repositories/ExternalLoginRepository.cs`
- `Services/AuthenticationService/External/{ExternalIdentity,IExternalIdentityVerifier,GoogleIdentityVerifier,MicrosoftIdentityVerifier}.cs`
- `DTOs/Authentication/ExternalAuthDTOs.cs`
- `Migrations/<timestamp>_AddExternalLogins.cs` (includes the `PasswordHash` nullability change)

**Backend — edited**
- `Data/ApplicationDbContext.cs` — `DbSet<ExternalLogin>`, indexes, FK
- `Models/ApplicationUser/User.cs` — `PasswordHash` nullable
- `Services/AuthenticationService/{IAuthenticationService,AuthenticationService}.cs` —
  `ExternalLoginAsync`, `ExternalSignupAsync`, `LoginAsync` guard
- `Services/AuthenticationService/{ITokenService,TokenService}.cs` — signup-ticket mint/validate
- `Controllers/Authentication/Authentication.cs` — two endpoints + `auth-config`
- `Services/Audit/AuditActions.cs` — `ExternalAccountLinked`
- `Program.cs` — register repository + verifiers; startup config validation
- `appsettings.json` / `appsettings.example.json` — `Authentication` section

**Frontend — new/edited**
- `package.json` — `@react-oauth/google`, `@azure/msal-browser`
- `src/lib/Auth.tsx` — external login/signup fns + schemas
- `src/pages/UserRelated/Login/LoginForm.tsx` — provider buttons
- `src/pages/UserRelated/Signup/…` — provider buttons + `ExternalSignupForm`
- `src/pages/UserRelated/Signup/api/auth-config.ts` (new hook; supersedes `signup-config.ts`)

**Docs**
- `docs/auth/social-login.md` (the "as built" doc, written at implementation time)
- `docs/auth/authentication.md` — add external login to the flow section + planned-work list
