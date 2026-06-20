# Email verification — design

> **Status: proposed / not yet implemented.** This document is the design we agreed
> to build. Nothing here is wired up yet. See "Files to touch" for the change surface.

## The problem

Today an email address is **never verified**. Someone can sign up with
`anyone@gmail.com` — or an address they don't own — and get a fully working account
immediately. The only two checks are:

| Check | Where | What it actually proves |
|-------|-------|-------------------------|
| **Format** (syntax) | `[EmailAddress]` on `DTOs/Authentication/SignupDTO.cs`; `EMAIL_REGEX` in `src/pages/UserRelated/Signup/api/check-availability.ts` | It *looks* like an email. Rejects `notanemail`. |
| **Uniqueness** | `EmailExistsAsync` in `Services/AuthenticationService/AuthenticationService.cs` (`SignupAsync`); `useEmailAvailability` (field `emailAvailable`) | It isn't already registered. **This is a duplicate check, not proof the inbox is real.** |

`SignupAsync` creates the user and immediately mints tokens. The "welcome" message it
sends is an **in-app notification** (the bell), not an email. The backend has **no email
sender at all**, and we use a custom BCrypt scheme — **not ASP.NET Identity** — so there's
no built-in `EmailConfirmed` / `RequireConfirmedEmail` to lean on.

## Goal & non-goals

**Goal:** prove the person signing up can receive mail at the address they gave, and
record that fact (`EmailConfirmed`).

**Non-goals:** password reset (separate feature, but will reuse the same email sender),
changing the auth/token scheme, magic-link login.

## The approach: double opt-in confirmation link

The only reliable proof of ownership is a **round-trip**: email a one-time link to the
address, and only mark it confirmed when the user clicks it. Everything else (MX lookups,
SMTP probes) is a guess and is treated as an *optional pre-filter*, never as verification.

```
signup ──> create user (EmailConfirmed = false)
       ──> generate one-time token, store hash, send email
                                   │
   user clicks link in inbox ──> POST /verify-email { token }
                                   │
                       valid + unexpired + unused
                                   │
                          EmailConfirmed = true, token consumed
```

## Data model

Mirror the existing **`RefreshTokens`** design (hashed at rest, single-purpose, lookup by
hash) rather than inventing a new pattern. Add a dedicated table:

**`EmailVerificationTokens`**

| Column | Notes |
|--------|-------|
| `Id` | PK |
| `UserId` | FK → `Users` |
| `TokenHash` | **SHA-256 of a 256-bit random token.** Raw token only ever leaves in the email. |
| `ExpiresAt` | `CreatedAt + 24h` (open decision) |
| `ConsumedAt` | null until used; single-use |
| `CreatedAt` | — |

And one flag on the user:

- **`User.EmailConfirmed`** (`bool`, default `false`) — the entity has no such field today;
  add it + EF migration (the project auto-applies migrations on startup, so no manual step).

> Reuse the hashing helper already in `Services/AuthenticationService/TokenService.cs` so the
> verification token is hashed exactly like refresh tokens. On "resend," supersede any
> outstanding token for that user (consume/delete) before issuing a new one.

## Email sending

Introduce an abstraction so the provider is swappable and dev doesn't send real mail:

```csharp
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}
```

- **Dev:** a no-op/console implementation (log the link), or MailHog over SMTP.
- **Prod (recommended):** a transactional provider with good deliverability —
  **Resend, Postmark, or SendGrid**. Plain SMTP works but lands in spam more often.
- **Config & secrets:** follow the existing pattern — API key from **user-secrets** in dev
  and the **environment** in prod (same as `Jwt:Key`; see `appsettings.example.json`). Fail
  fast at startup if a required key is missing in prod.

## Endpoints (extend `Controllers/Authentication/Authentication.cs`)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/Authentication/verify-email` | anonymous | Body `{ token }`. Validate (exists, unexpired, unused), set `EmailConfirmed = true`, consume token. |
| `POST /api/Authentication/resend-verification` | **authenticated** | Supersede prior token, send a fresh email. Rate-limited. |

Signup itself (`SignupAsync`) gains: create with `EmailConfirmed = false` → generate token →
`IEmailSender.SendAsync` with a link to `…/confirm-email?token=<raw>`.

## The gate: hard vs soft

**Decided: soft gate.** (Comparison kept below for context.)

| | **Hard gate** | **Soft gate (recommended)** |
|---|---|---|
| Behaviour | Can't log in / use the app until confirmed | Can log in and browse; *specific* actions are blocked until confirmed |
| Pros | Strongest guarantee | Far less signup friction; user sees value immediately |
| Cons | Friction; lost signups if email is slow/spam | Unconfirmed users exist in the system |
| Fit for a quiz app | Heavy | **Good** |

**Recommended soft gate:** let them in, show a persistent "Confirm your email" banner with a
**Resend** button, and block a small set of higher-trust actions until confirmed — candidates:
**hosting a multiplayer lobby**, **publishing a public quiz**, **exporting reports**. The
multiplayer-host gate connects directly to [`play-auth-and-identity.md`](./play-auth-and-identity.md)
(we can require `EmailConfirmed` to host).

## Frontend changes

- **Confirm page + route** `/confirm-email`: reads `?token=…`, POSTs it, shows
  success / expired / invalid, with a resend affordance.
- **Unconfirmed banner**: shown app-wide when `user.emailConfirmed === false` (new field on
  the user DTO / `useUser`), with a **Resend** action.
- **Signup success copy**: "Check your inbox to confirm your email."
- **Resend API** hook (mirrors `check-availability.ts` style).

## Optional pre-filters (reduce junk, do **not** replace the link)

- **Disposable-domain blocklist** at signup (reject `@mailinator.com`, temp-mail, …).
- **MX/DNS lookup** — does the domain accept mail at all? Rejects `@asdfasdf.qwer`.

These cut obvious garbage but never prove ownership. Always pair with the confirmation link.

## Security checklist

- Tokens **hashed at rest**, **single-use**, **time-limited**; constant-time compare on lookup.
- **No account enumeration**: `resend-verification` is authenticated (we already know who they
  are), so it never reveals whether an arbitrary address exists.
- **Rate-limit** sends (per user / per IP).
- HTTPS-only links. The link confirms the email; it does **not** auto-authenticate a session.
- Audit the confirmation (`AuditService` already exists); consider moving the "welcome"
  notification to *after* confirmation.

## Files to touch

**Backend**
- `Models/ApplicationUser/User.cs` — add `EmailConfirmed` (+ EF migration).
- New `EmailVerificationTokens` entity + repository (mirror `RefreshTokenRepository.cs`).
- New `IEmailSender` + provider implementation; DI + config in `Program.cs`.
- `Services/AuthenticationService/AuthenticationService.cs` — `SignupAsync` issues token+email;
  new `VerifyEmailAsync` / `ResendVerificationAsync`.
- `Controllers/Authentication/Authentication.cs` — `verify-email`, `resend-verification`.
- User DTOs — expose `emailConfirmed`.

**Frontend**
- New `/confirm-email` route + page.
- Unconfirmed-email banner + resend hook.
- Signup success copy.

## Open decisions

1. **Gate: hard or soft?** — ✅ **decided: soft.**
2. **Provider?** (recommend Resend or Postmark)
3. **Token storage:** dedicated table (recommended) vs columns on `Users`.
4. **Expiry window?** (default 24h)
5. **Require confirmed email to host multiplayer / publish quizzes?** (ties to play-auth doc)

## Testing plan

- Unit: token issue → verify happy path; expired token → rejected; reused token → rejected;
  resend supersedes prior token.
- Integration (`WebApplicationFactory` + real Postgres): signup creates `EmailConfirmed=false`
  + a token row; `verify-email` flips the flag and consumes the token.
- Manual (dev console sender): sign up, copy the logged link, hit `/confirm-email`, confirm the
  banner disappears.

## Related

- [`authentication.md`](./authentication.md) — token scheme this builds on.
- [`play-auth-and-identity.md`](./play-auth-and-identity.md) — the multiplayer-host gate.
