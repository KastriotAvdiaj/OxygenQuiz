# Password reset ("forgot password")

> **Status: implemented, and not deliverable in production yet.** The flow is complete and testable
> end to end locally, but `IEmailSender` still has exactly one implementation — `LoggingEmailSender`,
> which writes the message to the log and returns. Until a real provider is wired, a reset link
> reaches the backend container's stdout and nothing else. This is not new to this feature: email
> verification has the same gap and shipped with it. See §7.

Companion to [`email-verification.md`](email-verification.md), which this deliberately mirrors.

---

## 1. The shape, in one pass

```
/forgot-password ──POST /Authentication/forgot-password { email }
                     │
                     ├─ address unknown → do nothing, return 200
                     └─ address known   → supersede any live token,
                                          issue a new one (1 h, single use),
                                          email the link, audit, return 200
                     │
                  (both paths look identical to the caller)

/reset-password?token=… ──POST /Authentication/reset-password { token, newPassword }
                     │
                     ├─ bad / expired / already-used → 400, one generic message
                     └─ valid → set password, consume token,
                                revoke every refresh token,
                                mark email confirmed, audit
```

## 2. Files

| Piece | Where |
|---|---|
| Token entity | `Models/ApplicationUser/PasswordResetToken.cs` |
| Repository | `Repositories/PasswordResetTokenRepository.cs` (+ interface) |
| Token generation | `TokenService.GeneratePasswordResetToken()` |
| Flow | `AuthenticationService.RequestPasswordResetAsync` / `ResetPasswordAsync` |
| Endpoints | `Controllers/Authentication/Authentication.cs` |
| DTOs | `DTOs/Authentication/ForgotPasswordDTO.cs`, `ResetPasswordDTO.cs` |
| Pages | `src/pages/UserRelated/PasswordReset/` |
| Routes | `/forgot-password`, `/reset-password` — both anonymous |

## 3. The decisions worth knowing

**A separate table, not a `purpose` column on the verification token.** They are the same shape and
it is tempting to merge them. The failure mode of a merged table is that a bug letting one kind of
token be redeemed as the other converts "confirm your email" into "take over this account". Two
tables make that unrepresentable rather than merely unlikely.

**One hour, against verification's twenty-four.** A verification link proves an address; this one
hands over the account. The window should be about as long as it takes to go and read your mail.

**The request endpoint always answers 200.** Known address, unknown address, malformed-but-valid
address — all identical. Any difference turns the form into an oracle for "does this person have an
account here". The cost is real and accepted: a user who mistypes their address gets the same
reassuring screen as one who didn't, and no way to tell. **Do not add a "no account found" message.**
It will be suggested, it sounds helpful, and it is the whole vulnerability.

**Redeeming revokes every session.** The likeliest reason someone resets a password is that another
person knows the old one. Leaving existing refresh tokens alive would mean the reset locked out the
owner and nobody else. The success screen says so, because otherwise being signed out on the other
device reads as a bug.

**Redeeming also confirms the email.** Clicking a link sent to the address is exactly the proof the
verification flow asks for. An account that resets its password should not then be nagged to prove
the same thing.

**Accounts with no password can use it.** A Google-only user has `PasswordHash` null; the reset lets
them set one, and they end up with both sign-in methods. Refusing would strand anyone who lost
access to their Google account. Inbox control is the same evidence a reset always rests on, and the
alternative — replying "this account uses Google" — also leaks which accounts are Google-linked.

**Requesting again kills the previous link.** Otherwise a confused user clicking three times leaves
three live keys to their account in an inbox.

**One failure message for every bad token.** Malformed, unknown, expired and already-consumed are
indistinguishable to the caller. The frontend does not try to guess between them either — inventing
a distinction the API refuses to make would be inventing information.

**Both endpoints are rate limited** with `RateLimitingExtensions.AuthPolicy` — the request endpoint
because it sends mail, the redeem endpoint because it is a token-guessing surface.

## 4. What the reset page does *not* do

It does not fire on mount. The confirm-email page does, because its token is spent by arriving;
this token is spent by submitting. A reset link that burned itself on a link-scanning proxy or a
mail client's preview fetch would leave the user holding a dead link with no way back except asking
for another one.

## 5. Password rules

`ResetPasswordDTO` carries the same `[MinPasswordLength]` and `[NotACommonPassword]` attributes as
`SignupDTO` — deliberately the same attributes rather than a copy, because a reset path with a
weaker policy than signup is a way to get a short password onto an account that was not allowed one
at creation.

**The length is configuration**, `Auth:MinPasswordLength`: **8** in `appsettings.json`, **4** in
`appsettings.Development.json` so a throwaway test account does not need a passphrase. It was a
hard-coded 12, which could not be relaxed for development without also relaxing production.

Eight is not a downgrade dressed up. NIST SP 800-63B puts the minimum for user-chosen secrets at 8
and recommends screening against a breached/common list *instead of* composition rules — which is
exactly this pairing: `NotACommonPassword` still applies, and since 2026-09-02 so does a Have I
Been Pwned corpus check. The full reasoning, including why there are no capital/digit/symbol rules
and why the corpus check fails open, is in [`password-policy.md`](password-policy.md).

The client does **not** keep its own copy. `GET /Authentication/auth-config` reports
`minPasswordLength`, `useAuthConfig()` exposes it, and the signup form, the reset form and the
hints all read it from there. Before that the number existed in four places — two DTOs, a signup
form and a zod schema — with nothing keeping them in step. The client falls back to 8 if the field
is missing: guessing short would let a form accept a password the server then rejects, which reads
as a broken form rather than a policy.

### What the form tells the user

There are **no character-class rules** — no "one number, one capital". That is deliberate and is
the other half of the NIST recommendation above: composition rules push people toward predictable
substitutions (`Password1!`) while a blocklist catches the passwords that are actually breached.
So there are only two things to display, and both are shown as a small row of ticked chips under
the password field rather than a paragraph over it:

- **`N+ characters`** — from `minPasswordLength`, live.
- **`Both match`** — live.

They appear from the first keystroke, so an untouched form stays clean, and neither ever turns red:
an unmet rule on a password someone is still typing is not an error.

**Neither screening layer can be shown live.** Both are server-side and have to be — a client-side
blocklist is a downloadable list of the passwords we reject, and the corpus check is a network call
— so they can only be reported after submit. That is why `resetErrorMessage` exists: it pulls the field-specific sentence out of
the `ValidationProblemDetails` the DTO attributes produce, rather than the useless generic title,
so the user reads "Password must be at least 8 characters." or the common-password refusal in the
server's own words. Without it the form has to guess at the reason, which it did at first and which
is how you end up telling someone their link expired when their password was simply on the list.

## 5a. Signing in afterwards goes home, not back

`Login`'s success handler used `navigate(-1)` when no `?redirectTo=` was present. After a reset
that sent the user straight back to `/reset-password?token=…` — the page they had just finished
with, now holding a spent token — which looked exactly like the reset had failed and was reported
as a bug.

"Go back where you were" is wrong precisely when the previous page exists *because* you could not
sign in, so it now goes to `/` instead, matching `afterLogin()` which always did. Anywhere worth
returning to says so explicitly with `?redirectTo=`, which the guest-play and quiz routes already
use. The reset page also navigates to `/login` with `replace: true`, so the token URL does not stay
in history at all.

## 6. Running it locally

There is a migration to generate — the entity and the `DbSet` are in place but no migration file is:

```bash
dotnet ef migrations add AddPasswordResetTokens --project OxygenBackend/QuizAPI
```

`Program.cs` calls `Database.MigrateAsync()` on every boot, so it applies itself on the next start.

In development, where no `Email:Brevo:ApiKey` is set, the link comes out in the API log instead of
an inbox — that is the intended local setup, not a failure:

```
[DEV EMAIL] To: someone@example.com | Subject: Reset your Oxygen Quiz password
<p>Hi someone,</p>…<a href="https://localhost:5173/reset-password?token=…">
```

Copy the URL out of the log and open it. Worth exercising by hand: the link works once and fails the
second time; an expired token and a garbage token give the same message; resetting signs out a
session you had open in another browser; and a Google-only account can set a password and then use
either method.

## 7. Actually sending mail

**The code is done.** `BrevoEmailSender` (`Services/Email/`) posts to Brevo's transactional API and
is selected automatically whenever `Email:Brevo:ApiKey` is non-blank; with no key the app falls
back to `LoggingEmailSender`, which is the intended development setup. Startup says which one is
active, at `Error` in Production when it is the logger.

The API was chosen over Brevo's SMTP relay because Hetzner blocks outbound SMTP ports on new
accounts (a blocked 587 is indistinguishable from a misconfiguration), `System.Net.Mail.SmtpClient`
is obsolete for new work so SMTP would mean a MailKit dependency, and an HTTP status with a JSON
body is diagnosable where an SMTP code is a guess.

**What remains is account and DNS work, which no amount of code can do:**

1. **Verify `oxygenquiz.com` as a Brevo sending domain.** Brevo (Settings → Senders, Domains, IPs
   → Domains) issues the records; they go into Cloudflare DNS; then you confirm back in Brevo.
   Three records, and **SPF is not one of them** — Brevo only asks for SPF when you take a
   dedicated IP, so do not add one on spec, especially if the domain already has an SPF record for
   something else (two SPF records is worse than none).
   - a **TXT** "Brevo code" proving domain ownership
   - **DKIM**, as two CNAMEs or one TXT
   - a **DMARC** TXT at `_dmarc`

   Cloudflare specifics: set the DKIM CNAMEs to **DNS only (grey cloud)** — proxying makes
   Cloudflare answer with its own records and the check fails — and enter only the subdomain in the
   Name field, since Cloudflare appends the zone itself. Skipping domain authentication means mail
   is rejected with a 400 naming the sender, or silently filed as spam.
2. **Authorized IPs.** If key IP-blocking is enabled in Brevo, add the container's *egress*
   address — which is what Brevo sees, and is the **VPS host's** public IP, because containers on
   the default bridge NAT out through it. Get it from the host, not the container (the ASP.NET
   runtime image has no curl or wget):

   ```bash
   curl -s https://api.ipify.org        # on the VPS host
   ```

   A missing entry looks exactly like a bad key. **Note this in any server-rebuild checklist** — a
   new VPS address silently stops all mail.
3. **`BREVO_API_KEY` into `~/OxygenQuiz/.env.prod`.** The compose file already references it, and
   a name in `.env.prod` that nothing references reaches nothing
   ([`../deployment/production-topology.md`](../deployment/production-topology.md)).

`App__FrontendBaseUrl` is now set explicitly in the compose file. It used to fall back to the first
CORS origin — right by luck, and a wrong link matters once mail actually sends.

### Confirming it works

```bash
docker compose -f docker-compose.prod.yml logs backend | grep '\[Email\]'
```

`[Email] Brevo sender active, from no-reply@oxygenquiz.com.` at startup, then one line per
message:

```
[Email] Sent "Reset your Oxygen Quiz password" to k***@example.com. Brevo accepted: {"messageId":"<…>"}
```

**Successes are logged deliberately.** A sender that only speaks on failure makes "sent fine" and
"never ran" both look like silence, which is precisely how this path went months doing nothing
while appearing healthy. Recipients are masked — enough to tell two apart, not a list of every
user's address sitting in logs that get grepped and pasted into chat. Brevo's dashboard
(Transactional → Email → Logs) holds the full record if an investigation needs it.

On a rejection the log carries Brevo's own response: 401/403 points at the key or the authorized-IP
list, and a 400 mentioning `sender` points at an unverified domain — three failures that are
otherwise indistinguishable from outside.

**A send failure never throws**, deliberately: it would 500 a signup whose account was already
created, and it would break the reset endpoint's always-200 rule, rebuilding the enumeration oracle
§3 exists to prevent. Failures are logged at `Error` and swallowed; the token is already stored, so
the user can ask again.
