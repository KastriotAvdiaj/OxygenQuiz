# Proposal: what has to exist around a paid, public launch

**Status: open.** Nothing implemented. Written 2026-10-07. Companion to
[`paid-plans-and-payments.md`](./paid-plans-and-payments.md). Paddle will not approve checkout
until most of this is live.

Today a stranger can reach oxygenquiz.com, sign in with Google, and create content that anyone can
play. Yet there is no page saying what the rules are, what happens to their data, or who runs the
site. That was fine while signup was invite-only. It isn't for a public site that takes money,
serves EU visitors, and stores the first names of school pupils. This proposal lists what has to
be added, from an audit of the code on 2026-10-07, and what is already fine.

**Not legal advice.** The law that applies is Kosovo's data-protection law (Law No. 06/L-082,
modelled on the GDPR), plus the GDPR itself for EU visitors and EU consumer rules for EU buyers.
Paddle, as Merchant of Record, covers the consumer-sale side. A local lawyer should review the
final Terms and Privacy Policy. They are short documents, so a review is cheap.

---

## 1. What happens today

| Area | Found in the code | Status |
|---|---|---|
| Terms of Service | No route, no page, no link anywhere | **Missing** |
| Privacy Policy | None | **Missing** |
| Refund policy, pricing page | None | **Missing** (Paddle requires both) |
| Who runs the site, contact | None | **Missing** |
| Site footer | None outside the dashboard quiz page; public pages have nowhere to put legal links | **Missing** |
| Consent at signup | `SignupForm.tsx` and `ExternalSignupForm.tsx` have no terms acceptance; `User` has no field recording it | **Missing** |
| Minimum age | Not asked, not stated | **Missing** |
| Reporting a public quiz | No report/flag action | **Missing** |
| Personal-data export | None for a user's own data (`IDataExportService` exists for admin and reports) | **Missing** — email requests are acceptable at first |
| Account deletion | Built: 30-day grace, then anonymisation ([`account-closure.md`](../auth/account-closure.md)) | **Fine** |
| Email | Transactional only (verification, reset) through Brevo; no newsletters | **Fine** |
| Security headers, rate limits, HttpOnly refresh cookie | Built | **Fine** |

### 1.1 Does it need a cookie banner? No, not today

A banner is needed for non-essential storage: analytics, advertising, tracking. Everything the
app stores today is either essential to running it or something the user asked for:

| Storage | Set by | Purpose | Needs consent? |
|---|---|---|---|
| Refresh-token cookie (HttpOnly) | `Authentication.cs` | Staying signed in | No — strictly necessary |
| `has_session` cookie | `Authentication.cs`, read in `session-hint.ts` | Whether to try a silent sign-in ([ADR 0016](../adr/0016-a-readable-hint-decides-whether-boot-asks-the-server.md)) | No — strictly necessary |
| `guest_played` cookie (1 year) | `GuestQuizSessionsController` | The one-free-quiz limit | No — part of the service asked for |
| `localStorage`: theme | `theme-provider.tsx` | A preference the user set | No |
| `localStorage`: drafts | `drafts/draft-storage.ts` | Unsaved work the user is writing | No |
| `localStorage`: coach hint | `Associations/board/coach-storage.ts` | Dismissed tip | No |
| `sessionStorage`: `quiz_session` | Multiplayer lobby | Current lobby | No |

There is no analytics script, no ad tag and no tracker in `index.html` or `package.json`. **So no
banner, but the Privacy Policy must list these.** A banner becomes necessary the day any of these
is added: Google Analytics, a Meta pixel, Cloudflare Web Analytics with cookies, Hotjar/Clarity,
or Paddle Retain. Prefer cookieless analytics (Plausible, or Cloudflare Web Analytics, which is
cookieless) and the banner stays unnecessary.

Two third-party loads still need handling:

- **Google Fonts are loaded from Google's servers** (`index.html`, ten font families from
  `fonts.googleapis.com`). Every visitor's IP address goes to Google without consent. A Munich court
  awarded a visitor damages for exactly this in 2022. **Fix: self-host the fonts** with
  `@fontsource/*` packages, or download them into `public/`. Small job, and the site gets faster.
- **Google sign-in** (`@react-oauth/google`) loads an iframe from `accounts.google.com` on the
  login and signup pages. That's part of a function the visitor chose, so it's acceptable. It
  goes in the Privacy Policy, and ideally loads only on those two pages (check that it isn't
  mounted globally by `GoogleOAuthProvider`).

Paddle.js must likewise load **only on `/pricing`** (see the payments proposal, Phase 2), not
site-wide.

---

## 2. What to add

### 2.1 Pages (public routes, linked from a footer on every public page)

| Route | Contents |
|---|---|
| `/terms` | Who may use it (minimum age, §2.3); accounts; **user content** — users own their quizzes and grant OxygenQuiz a licence to host and show them, must have the rights to what they upload or paste into the AI, no illegal or hateful content; **AI-generated content may be wrong** and must be reviewed; **Teachers** are responsible for the pupil names they enter (§2.4); paid plans and that Paddle is the seller (its buyer terms apply); termination; liability limits; governing law (Kosovo); how changes are announced |
| `/privacy` | Who is responsible (name, address, email); what is collected and why (§3); who it is shared with (§3); where it goes (international transfers); how long it's kept (link to the 30-day closure flow); the cookies and storage table from §1.1; rights (access, correction, deletion, export, complaint to Kosovo's Information and Privacy Agency or an EU authority) |
| `/refunds` | Simple and generous: a full refund within 14 days of the first payment, no questions asked, handled through Paddle. Cancel any time; access runs to the end of the paid period. |
| `/pricing` | The plans (also what Paddle reviews) |
| `/contact` or a footer block | Business name, registered address, business number (NUI), contact email |

Write them as plain React pages with the content in one file each (Markdown rendered to JSX is
fine). Put a **"Last updated"** date and a **version number** at the top of Terms and Privacy.

### 2.2 Consent at signup, recorded

- Below the signup button, on **both** the email form and the Google path
  (`ExternalSignupForm.tsx`): *"By creating an account you agree to the Terms and confirm you've
  read the Privacy Policy."* with links. A sentence is enough. A pre-ticked box is not, and an
  unticked required box adds friction for no legal gain.
- **Record it:** `User.TermsAcceptedAt` and `User.TermsVersion` (migration), set in the same
  transaction that creates the user.
- **When the Terms change materially:** bump the version. Users on an older version see a one-time
  dialog on next sign-in ("We've updated our Terms — here's what changed"). Existing users at
  launch get that dialog once.

### 2.3 Minimum age

Pupils will meet the product through teachers, so state an age and ask for it:

- **Terms:** accounts are for users **16 and over**, or **13–15 with a parent's or teacher's
  permission**. 16 is the strictest GDPR default, so it works across the EU.
- **Signup:** one required checkbox, "I'm 16 or older, or I have a parent's or teacher's
  permission." Don't collect a date of birth; it's data you then have to protect, for little
  benefit.
- **Host mode is already the right shape for children.** Pupils play without accounts, and the
  Displays need no login ([ADR 0024](../adr/0024-a-display-needs-no-login.md)). Say so in the
  privacy policy, because it's a selling point to schools.

### 2.4 Pupils' names in Classes

A Class stores pupils' first names entered by the Teacher (up to 40 per class). For that data the
Teacher (or their school) decides what is entered and why, and OxygenQuiz stores it on their
behalf. So:

- **Terms:** Teachers may enter first names or nicknames only, and only with their school's
  permission.
- **Privacy:** say that Class names are kept only for the Teacher, are never shown publicly, and
  are deleted with the Teacher's account. The last part is already true: anonymisation removes
  Classes.
- **Later, for School plans:** a short data processing agreement (DPA) that a school can sign. A
  template is enough.

### 2.5 Reporting public content

Public quizzes are user content anyone can see. Add a **"Report this quiz"** action on the quiz
card or start dialog: a reason plus optional text. It creates a row that admins see on the
dashboard, next to Teacher Requests. Until that's built, a report email address in the footer and
Terms is the minimum. EU rules for hosting user content expect an easy way to report illegal
content and a contact point.

### 2.6 "Download my data"

The right of access and portability can be met by email ("write to privacy@…, we reply within 30
days") at launch. When it's worth automating, add a button in the account panel: a JSON file of
profile, quizzes, questions, session history and Classes, built with the existing
`IDataExportService`.

---

## 3. What the Privacy Policy has to name

| Data | Why | Shared with | Where |
|---|---|---|---|
| Email, username, password hash, profile image | The account | Hetzner (hosting), Brevo (emails) | EU (Finland, France) |
| Google account id, name, email (Google sign-in) | Signing in | Google | US |
| Quizzes, questions, uploads | The service | Hetzner | EU |
| Play history, answers, scores | Stats, history, analytics for quiz owners | Hetzner | EU |
| **Text sent to the AI** (topic or pasted source material) | Generating questions | The AI vendor (Groq today; check its data retention) | US |
| Pupils' first names in Classes | Host mode, for the Teacher | Hetzner | EU |
| IP address, request logs | Security, rate limiting | Cloudflare | Global |
| Payment, billing address, VAT details | Buying a plan | **Paddle**, as the seller — OxygenQuiz never sees card numbers | UK/EU/US |

**Tell users not to paste personal data into the AI box.** A line in the wizard
("Don't include personal information — this text is sent to our AI provider.") and the same
sentence in the policy.

---

## 4. Recommendation and order

1. **Self-host Google Fonts** — half a day, removes the only consent problem the site has today.
2. **Footer + `/terms`, `/privacy`, `/refunds`, `/contact`** — the text is most of the work.
   Generate a first draft from a template, then have it reviewed.
3. **Signup consent line + age checkbox + `TermsAcceptedAt` / `TermsVersion`.**
4. **AI privacy line in the wizard.**
5. **`/pricing`** — from the payments proposal, Phase 1.
6. **Report a quiz** — at minimum the email address; the button can follow.
7. **Apply to Paddle** once 1–5 are live.

**Effort:** about 2–3 days of code, plus writing the documents and a lawyer's review. No cookie
banner — unless analytics or marketing tags are added, in which case revisit §1.1 first.
