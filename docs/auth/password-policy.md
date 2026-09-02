# Password policy — and why there are no composition rules

What OxygenQuiz requires of a password, and the reasoning, because the first instinct on reading
the rules is that something is missing.

---

## 1. The rules, in full

| Rule | Where | Enforced |
|---|---|---|
| At least `Auth:MinPasswordLength` characters — **8** in production, **4** in development | `MinPasswordLengthAttribute` | Signup + reset |
| At most 128 characters | `[MaxLength(128)]` | Signup + reset |
| Not in the local common-password list (78 entries), and not a single repeated character | `NotACommonPasswordAttribute` | Signup + reset |
| Not in Have I Been Pwned's breached corpus (~850M) | `PwnedPasswordsChecker` | Signup + reset |

**That is the whole list.** No required capital, no required digit, no required symbol. This is
deliberate, it is the current standard rather than a shortcut, and it is the part most likely to be
"corrected" by someone who has not read this file.

## 2. Why no capitals, digits or symbols

NIST reversed its own long-standing advice in SP 800-63B: verifiers **SHOULD NOT** impose
composition rules. Three reasons, none of them about convenience.

**They produce a ritual, not randomness.** Told to add a capital, people capitalise the first
letter. Told to add a digit, they append `1` or a year. Told to add a symbol, they append `!`.
`password` becomes `Password1!`, which satisfies every rule and sits in every cracking dictionary.
Hashcat ships rule sets that apply exactly these transformations, so the mutations a composition
rule forces are the first ones an attacker tries. The rule moves the password from one guessable
place to another guessable place.

**They cost security elsewhere.** Harder-to-remember passwords get reused across sites, written
down, or cycled (`Summer2025!` → `Autumn2025!`). Credential stuffing — replaying a password leaked
from somewhere else — is a far more common way accounts fall than character-class-aware guessing,
and composition rules make reuse more likely, not less.

**They buy less entropy than they appear to.** Forcing one digit does not multiply the search space
by ten; it concentrates probability on the handful of digits people actually choose, in the
position they actually choose.

What NIST recommends instead is what is implemented here: a reasonable minimum length, a generous
maximum, every character permitted including spaces and Unicode, and **screening against known
breached passwords**. The screening is the half doing the real work — it targets what attackers
actually try, rather than guessing at what makes a password strong.

## 3. Why there are two screening layers

`NotACommonPasswordAttribute` holds 78 entries. `PwnedPasswordsChecker` holds ~850 million. The
small one is not redundant, and merging them is not possible.

**It cannot be merged**, because DataAnnotations validation is synchronous and the corpus check is
an HTTP call. Blocking on it inside an attribute would be sync-over-async on every signup. So the
local list stays an attribute — cheap, offline, instant — and the corpus check runs afterwards in
`AuthenticationService`, where awaiting is normal.

**It should not be merged**, because the local list is what remains when the network one fails. See
below.

## 4. How the corpus check works, and what it does not send

Have I Been Pwned's **k-anonymity range API**. We take SHA-1 of the password, send the **first five
hex characters** of it, and receive every suffix sharing that prefix — roughly 800 of them. The
match happens locally.

**The password never leaves the server. Neither does its full hash.** HIBP learns only that
somebody asked about one of ~800 possible passwords, which tells it nothing useful. That property
is the entire reason it is acceptable to call this from a signup form; an API that took the
password and answered yes-or-no would not be, at any level of TLS.

Requests send `Add-Padding: true`, so the response is padded with decoy suffixes — without it the
*size* of the response is itself a weak signal about the prefix, visible to anyone watching the
connection.

SHA-1 here is not a security choice and is not a weakness: it is the index format the corpus is
published in, and it is being used to look a value up, not to protect one. Stored passwords are
BCrypt, unchanged.

## 5. It fails open, and that is the decision

A timeout, a 5xx or no network resolves to **"not breached"** — the password is accepted.

The alternative is refusing every signup and every password reset because a third party is having a
bad afternoon. That trades a small, quiet reduction in password quality for a total outage of two
features, which is the same trade rejected in
[`../adr/0004-ai-misconfiguration-disables-the-feature.md`](../adr/0004-ai-misconfiguration-disables-the-feature.md)
for the same reason.

**Failing open is only tolerable because the local list is not.** `NotACommonPassword` has already
run, offline, before this check happens. So an outage degrades the policy to what it was before
this feature existed — not to nothing. That is what makes the small list load-bearing rather than
vestigial, and why removing it in a tidy-up would quietly turn a graceful degradation into a hole.

Every failure logs at `Warning` with the `[PwnedPasswords]` prefix, so a check that is permanently
broken is visible rather than silent:

```bash
docker compose -f docker-compose.prod.yml logs backend | grep '\[PwnedPasswords\]'
```

`Auth:BreachedPasswordCheck:Enabled=false` switches it off entirely, for environments with no
outbound network where every signup would otherwise wait out the timeout first.

## 6. What the user is told

The rejection says the password "has appeared in a known data breach" and does not mention HIBP.
The reason is what the user needs to act on; saying we asked a third party invites the
reasonable-but-wrong worry that we sent their password somewhere. We did not — but a signup form is
the wrong place to explain k-anonymity.

The **reset form shows only the rules it can check live** — length, and that both entries match —
as a small row of ticked chips. Neither screening layer can be evaluated in the browser: a
client-side blocklist would be a downloadable list of the passwords we reject. Both therefore
surface only after submit, in the server's own words, via `resetErrorMessage`. See
[`password-reset.md`](password-reset.md) §5.

## 7. If you are tempted to change this

- **Adding a capital/digit/symbol requirement** makes passwords worse, for the reasons in §2. Read
  SP 800-63B first.
- **Removing the 78-entry local list** removes the floor that makes failing open acceptable (§5).
- **Making the corpus check fail closed** turns a third-party outage into an outage of signup and
  password reset.
- **Raising the minimum length** is the one change here that is straightforwardly defensible; 8 is
  a floor, not a target.

Sources: NIST SP 800-63B §3.1.1 (memorized secrets); Troy Hunt, *Have I Been Pwned* Pwned Passwords
range API and its k-anonymity model.
