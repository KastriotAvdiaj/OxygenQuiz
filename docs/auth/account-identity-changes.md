# Changing your username or email

> **Status: implemented 2026-09-27.** Email changes send mail through the same `IEmailSender` as
> every other flow: Brevo when `Email:Brevo:ApiKey` is set, otherwise the backend log — in
> development, read the confirmation link from there (see [password-reset.md](password-reset.md) §7).

Both live in the account overlay's **My Account** section
([account-overlay.md](../development/account-overlay.md)). Password changes are the reset flow
pointed at your own address — see that doc.

---

## 1. Username

`PUT /api/Users/me/username { username }` → the updated `AccountIdentityDTO`.

- **Only the display name changes.** `ImmutableName` — the handle chat, `/Users/username/{name}` and
  old links use — is never touched.
- **The name must be free in both name columns of every other counted account**, ignoring case.
  This is the rule in [ADR 0017](../adr/0017-one-namespace-for-names.md), and signup now asks the
  same question.
- **Once per 30 days.** Changing only the case of your current name is exempt.
- 3–50 characters, the same bounds as signup — a rename can't be a way around them.
- Audited as `UsernameChanged` with old and new values.

## 2. Email

```
Account panel ──POST /Users/me/email-change { newEmail, currentPassword }
                  │  password wrong / none set → 400    address taken → 409
                  └─ supersede any pending change, store the NEW address with a
                     one-time token (1 h), mail the link to the NEW address, audit
                     (User.Email is not touched)

/confirm-email-change?token=… ──(click)──POST /Authentication/confirm-email-change { token }
                  │  bad / expired / used → 400    address taken since → 409
                  └─ swap the address, mark it confirmed, consume every outstanding
                     change / reset / verification link, mail a notice to the OLD
                     address, audit

DELETE /Users/me/email-change   cancel a pending change
GET    /Users/me/identity       { username, hasPassword, pendingEmail, nextUsernameChangeAt }
```

The decisions worth knowing:

**Nothing changes until the new inbox answers.** The link goes to the new address and the swap
happens on redemption. A typo can't strand an account on an address nobody reads, and the account
keeps recovering through the old address in the meantime.

**The current password is required.** A signed-in session alone could otherwise move the recovery
address and then reset the password from the new inbox — a stolen or unattended session turned
into a permanent takeover. An account with no password (Google/Microsoft-only) is asked to set one
first, through Change password; the API refuses it the same way.

**Redeeming kills every other link.** In particular a password-reset link already sitting in the
*old* inbox: left alive, it would hand the account to whoever reads that inbox after the owner has
moved away from it.

**The old address is told.** If the change wasn't the owner's, that mail is how they find out.

**Sessions are not revoked.** The change was password-gated, and signing the owner out of the
device they just confirmed on would read as a failure. (A password reset does revoke them — there
the likely story is that someone else knows the password.)

**"Already in use" is said out loud** (409). Unlike forgot-password, the caller is authenticated
and password-checked, and the anonymous `GET /Users/availability` answers the same question anyway.
The address is re-checked at redemption, because the request may be an hour old.

**The page waits for a click**, like the reset page and unlike confirm-email: this link moves the
recovery address, and a mail scanner that fetched and ran the page must not be what completes it.

**A separate token table**, `EmailChangeTokens`, for the reason reset and verification tokens have
their own: a bug that let one kind be redeemed as another must be unrepresentable.

### The endpoint this replaced

`PUT /api/Users/{id}` took `{ email, profileImageUrl }` from the user or an admin and wrote both in
directly: no uniqueness check (two rows with one address, and login's `SingleOrDefaultAsync` then
throws), no proof of the new address (`EmailConfirmed` stayed true), no audit, no notice. Nothing in
the frontend called it. It is **removed**, with its `UpdateUserDTO` and `UserService.UpdateUserAsync`;
the avatar changes only through the validated upload.

## 3. Database uniqueness

Until now, uniqueness of email and name was only the app-level checks, which two concurrent requests
can both pass. The `AddIdentityChanges` migration adds **partial** unique indexes on `Email`,
`ImmutableName` and `lower("Username")`, over the rows those checks count (live, or in the closure
grace period — `NOT "IsDeleted" OR ("DeletionRequestedAt" IS NOT NULL AND "AnonymisedAt" IS NULL)`).
They must be partial: an admin-deleted row deliberately gives up its address and name (see
`UserRepository.EmailExistsAsync`), and a plain index would contradict that.

**If the migration fails**, the database already holds duplicates the app checks were meant to
prevent. Find them before retrying:

```sql
SELECT lower("Username") AS name, count(*) FROM "Users"
WHERE NOT "IsDeleted" OR ("DeletionRequestedAt" IS NOT NULL AND "AnonymisedAt" IS NULL)
GROUP BY 1 HAVING count(*) > 1;
-- and the same with "Email", and with "ImmutableName"
```

## 4. Multiplayer: players are identified by account id

Before this change the live match was keyed by the player's name, taken from the JWT's `username`
claim, and saved at the end by lower-casing each name and matching it against `ImmutableName` —
which only worked because the two always agreed. After a rename, the renamed player's results were
silently not recorded, and the host lookup at match start failed.

Now:

- `Participant.UserId` is the identity; the hub reads the display name **from the database** when a
  connection creates or joins a lobby (the token's claim lags a rename until it refreshes).
- `MultiplayerSession.PlayerUserIds` records *name → user id* for every account that has been in the
  lobby, and is never pruned. The match state is still keyed by name, but that name is **pinned** to
  the account for the lobby's lifetime: someone who leaves and comes back — renamed or not — gets
  the same name back, so scores, answers and `HostUsername` still line up.
- Reconnects are recognised by user id, not by name.
- At match start the host id, and at match end every player's id, come from `PlayerUserIds` — in
  both the Classic loop and the Associations Duel (`AssociationMatchOrchestrator`).
- The Duel's move methods (`OpenTile`, `GuessAssociation`, `PassTurn`) act as the connection's
  pinned name, like every other in-lobby method.
- The client finds itself in the roster by `userId`
  (`use-lobby-connection.ts`), since its pinned name may differ from its current display name.
- A different account joining under a name the lobby has already seen is refused with
  `name-in-use` — reachable only if someone renamed away and another account took the released name.

## 5. Files

| Piece | Where |
|---|---|
| Service (both flows) | `Services/AccountIdentity/AccountIdentityService.cs` |
| Endpoints | `Controllers/Users/UsersController.cs` (`me/identity`, `me/username`, `me/email-change`), `Controllers/Authentication/Authentication.cs` (`confirm-email-change`) |
| Token | `Models/ApplicationUser/EmailChangeToken.cs`, `Repositories/EmailChangeTokenRepository.cs`, `TokenService.GenerateEmailChangeToken` |
| Name check | `UserRepository.NameTakenAsync` |
| Migration | `Migrations/*_AddIdentityChanges.cs` |
| Lobby identity | `MultiplayerSession.PlayerUserIds`, `InMemoryQuizSessionManager.AddParticipantAsync`, `QuizHub`, `MatchOrchestrator`, `AssociationMatchOrchestrator` |
| Frontend | `AccountOverlay/panels/IdentityEditors.tsx`, `AccountOverlay/api/account-identity.ts`, `ConfirmEmailChange/ConfirmEmailChange.tsx` |
| Tests | `QuizAPI.Tests/Users/AccountIdentityTests.cs`, `QuizAPI.Tests/Playing/LobbyIdentityTests.cs` |
