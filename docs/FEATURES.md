# What OxygenQuiz does

Every feature in one place, with its status and where the detail lives. This is the source of
truth for describing the app — a CV line, a cover letter, an interview answer or the README should
be taken from here, and if one of them says something this file doesn't, this file is right or this
file is stale. **A change that adds, removes or changes what a user can do updates its row here in
the same change** ([`development/documenting-changes.md`](development/documenting-changes.md)).

Numbers carry the date they were counted, and the command that counts them, because they go stale.

## In one paragraph

OxygenQuiz is a quiz platform built around the TV show *Oxygen*. People build quizzes by hand or
with AI, play them solo against the clock or live against friends in a lobby, and share them by
link; teachers host the show's final round, Associations, for a class on one screen. It is a
React 18 + TypeScript SPA on Cloudflare Workers and an ASP.NET Core 8 API with PostgreSQL and
SignalR, in Docker on a Hetzner VPS behind Cloudflare. Live at [oxygenquiz.com](https://oxygenquiz.com).

**Status:** **Live** = anyone with an account (or a guest, where noted). **Preview** = admins and
Teachers only, while it is tested. **Not shipped** = built in part, not reachable by users.

## Playing

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Solo Classic quiz | Live | An ordered list of questions, each answered once against its own timer; the server serves one question at a time and grades it. | [quiz-grading.md](quiz/quiz-grading.md), [quiz-playing-architecture.md](quiz/quiz-playing-architecture.md) |
| Question types | Live | Multiple choice (one or several correct), true/false, and type-the-answer. | [glossary.md](quiz/glossary.md) |
| Typed-answer matching | Live | Accepted alternative spellings per question; spacing is normalised, and case ignored unless the question is case-sensitive. | [typed-answer-matching.md](quiz/typed-answer-matching.md) |
| Fair timing | Live | Scored on latency-compensated think time; the server decides how much of the client's clock to trust. | [quiz-grading.md](quiz/quiz-grading.md) |
| Instant feedback and explanations | Live | Optional right/wrong after each answer, and an optional short "why" shown after answering. | [question-explanations.md](quiz/question-explanations.md) |
| Answer order shuffled | Live | Options are reordered every time a question is served, so positions can't be memorised. | [ADR 0006](adr/0006-answer-order-is-shuffled-at-serve-time.md) |
| Resume an unfinished quiz | Live | Reopening a quiz with a session in progress offers Resume or Start fresh; abandoned sessions are swept in the background. | [session-resume-screen.md](quiz/session-resume-screen.md), [session-lifecycle.md](quiz/session-lifecycle.md) |
| Results and review | Live | Score breakdown, then a question-by-question review of what you answered. | [quiz-grading.md](quiz/quiz-grading.md) |
| Guest play | Live (guests) | One free solo quiz per browser without an account; the result is shown once and nothing is stored. | [guest-play.md](auth/guest-play.md) |
| Stats and history | Live | Aggregate play stats and a filterable history of past sessions, bucketed in the viewer's timezone. | [user-stats-history.md](quiz/user-stats-history.md) |

## Multiplayer

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Live lobbies | Live | A host opens a lobby, players join by 6-character room code or invite link, and the match runs in lockstep for everyone over SignalR. The server owns timing, correctness and scoring. | [multiplayer.md](quiz/multiplayer.md), [multiplayer-join.md](quiz/multiplayer-join.md) |
| Resilient lobbies | Live | A lobby outlives a match (rematch), survives a host refresh, and re-joins players after a dropped connection. | [multiplayer.md](quiz/multiplayer.md) §3 |
| Lobby chat | Live | In-memory chat for the life of the lobby; never stored. | [multiplayer.md](quiz/multiplayer.md), [mongodb.md](data/mongodb.md) |
| Host any of your own quizzes | Live | The picker switches between public quizzes and your own, so an Unlisted or Draft quiz can be played with friends. | [quiz-visibility.md](quiz/quiz-visibility.md) |

## Associations — the show's final

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Associations format | Preview | A Board of four Columns of four hidden Tiles; open Tiles, guess each Column's solution, then the Final solution. A whole second quiz format, not a question type. | [associations.md](quiz/associations.md), [ADR 0018](adr/0018-quiz-formats-are-separate-verticals.md) |
| Board builder | Preview | Build and edit a Board, with drafts restored after a refresh. | [associations.md](quiz/associations.md) |
| Solo | Preview | One player against a board timer. | [associations.md](quiz/associations.md) |
| Duel | Preview | Two players taking turns on one Board, as in the show, ending in a guess-only endgame; a player who drops is forfeited. | [associations.md](quiz/associations.md) §10, [ADR 0021](adr/0021-a-duel-is-forfeited-when-the-lobby-drops-the-player.md) |
| A game is its move log | Preview | Board state is never stored; it is replayed from the moves, which is what makes undo and review exact. | [ADR 0020](adr/0020-an-associations-game-is-its-move-log.md) |

## Classroom

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Teacher role | Live (by request) | Users request it from their account panel; an admin approves. Teachers can host Associations for a class. | [teacher-role.md](auth/teacher-role.md) |
| Classes | Live (Teachers) | Saved lists of students' first names (not accounts) to form Teams from. | [classroom.md](quiz/classroom.md) §1 |
| Host mode | Live (Teachers) | A Teacher runs a Board for 2–4 Teams from a Controller (laptop or phone) while a Display shows it on the classroom screen; custom or unlimited time; undo. | [classroom.md](quiz/classroom.md), [ADR 0023](adr/0023-a-hosted-team-is-a-seat.md), [ADR 0025](adr/0025-undo-is-a-move.md) |
| Display needs no login | Live | The classroom screen connects with a short Screen code from the Controller, so the projector's browser never signs in. | [ADR 0024](adr/0024-a-display-needs-no-login.md) |
| Hosted games | Live (Teachers) | A history of hosted games and their results. | [classroom.md](quiz/classroom.md) |

## Creating

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Quiz builder | Live | Three columns on a desktop (quiz fields, the question being edited, the question list); a list-and-dialog overview on phones and tablets. | [quiz-overview.md](quiz/quiz-overview.md), [ADR 0026](adr/0026-the-quiz-overview.md) |
| AI generation | Live | Describe a topic and question types and get a draft quiz to review — generated in the app, or pasted from your own AI. The model only proposes: a strict parser drops bad questions with a reason and never lets it choose grading rules. Quota, daily and spend caps, a cost ledger and a kill switch. | [ai-quiz-generation-flow.md](quiz/ai-quiz-generation-flow.md), [ai-quiz-two-paths.md](quiz/ai-quiz-two-paths.md), [ADR 0003](adr/0003-the-model-proposes-the-code-decides.md) |
| Drafts survive a crash | Live | Everything typed into the builder, the board builder or the AI wizard is restored after a refresh or closed tab. | [quiz-draft-persistence.md](quiz/quiz-draft-persistence.md) |
| Safe editing | Live | Copy-on-write versioning of a quiz's questions: editing never corrupts a game in progress or loses answer history. Removing a question asks first (or not, after "Don't ask again") and can be undone, several steps back. Your own unplayed question used by no other quiz is edited directly; any other saved question is edited as a copy for that quiz only, with the reason shown. | [quiz-editing.md](quiz/quiz-editing.md) |
| Question bank | Live | Questions are reusable across quizzes, filed by category, language and difficulty. | [quiz-question-classification.md](quiz/quiz-question-classification.md) |
| Images and audio on questions | Live | An image or a short audio clip (≤ 60 s) on any question, and a cover image on a quiz. Every image is re-encoded (location data stripped), stored once on Cloudflare R2, served from its own domain; unused files are swept. A daily allowance counts what you save, not what you try. | [media-pipeline.md](media/media-pipeline.md), [ADR 0032](adr/0032-media-is-attached-by-id-and-the-server-writes-the-url.md), [ADR 0033](adr/0033-stored-media-is-swept-not-reference-counted.md) |
| Free images from Wikimedia Commons and Pexels | Live (Pexels needs a key) | Search either from the image picker instead of uploading; only images free to reuse with credit are offered. The chosen one is copied into our storage like an upload, and its credit follows it — under the image in the editor, behind an ⓘ during play. | [media-pipeline.md](media/media-pipeline.md) §7, [ADR 0035](adr/0035-outside-images-are-imported-by-id-never-hotlinked.md) |
| Import / export | Live (dashboards) | Questions, quizzes, users and the lookup lists from CSV, Excel or JSON; bad rows are skipped and reported. | [import-templates](data/import-templates/README.md) |
| Publishing rules | Live | Draft / Unlisted / Public; a quiz is Public only once its category, language and difficulty are real. | [quiz-visibility.md](quiz/quiz-visibility.md) |

## Discovery and sharing

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Catalogue | Live | Search, faceted filters (category, difficulty, language) and a default "Mixed categories" order that shows the newest quiz of every category before the second of any. | [quiz-discovery.md](quiz/quiz-discovery.md), [filtering.md](quiz/filtering.md) |
| Picked and community quizzes | Live | The catalogue opens on picked quizzes — the house's own and community quizzes the team chose, badged "Oxygen Pick". Everyone else's are one switch away, behind a one-time notice that they aren't checked. Only picked quizzes are indexed by search engines. | [moderation.md](media/moderation.md) §5 |
| Quiz cards | Live | Each card in its category's colour palette; admins set palettes, optionally with AI-proposed options. | [quiz-card.md](quiz/quiz-card.md), [category-palettes.md](entities/category-palettes.md) |
| Share links | Live | An Unlisted quiz is reached only by an unguessable link (sign-in required to play). | [quiz-visibility.md](quiz/quiz-visibility.md) |
| Link previews | Live | A shared link previews in WhatsApp, Discord, Slack and X with the quiz's own title and description, filled in by a Cloudflare Worker; never indexed by search engines. | [frontend-worker.md](deployment/frontend-worker.md) |
| Quiz page per quiz for search | Live | A public page per Public quiz at `/q/:id/:slug` (indexable when the quiz is picked) — rendered by the Cloudflare Worker for crawlers, taken over by the app in the browser — plus `/sitemap.xml`. Copy link gives a Public quiz this URL. | [quiz-listing.md](quiz/quiz-listing.md), [ADR 0028](adr/0028-the-worker-renders-the-quiz-listing-for-crawlers.md), [known-issues.md](deployment/known-issues.md) |

## Accounts

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Sign-in | Live | Short-lived JWT in memory, refresh token rotated on every use in an HttpOnly cookie. | [authentication.md](auth/authentication.md) |
| Google and Microsoft sign-in | Live | Either provider replaces only the password check; the app's own session takes over. | [social-login.md](auth/social-login.md) |
| Email verification, password reset, password policy | Live | Mail through Brevo. | [email-verification.md](auth/email-verification.md), [password-reset.md](auth/password-reset.md), [password-policy.md](auth/password-policy.md) |
| Invite-gated signup | Live (config flag) | Signup can be restricted to single-use invite codes, managed by admins. | [invite-code-system.md](auth/invite-code-system.md) |
| Change email or username | Live | Email changes are confirmed from the new address. | [account-identity-changes.md](auth/account-identity-changes.md) |
| Close your account | Live | Recoverable for 30 days, then personal data is scrubbed while history stays intact. | [account-closure.md](auth/account-closure.md), [ADR 0012](adr/0012-account-deletion-is-anonymisation-after-a-grace-period.md) |
| Account overlay | Live | Profile, stats and settings in a panel over the current page; light and dark themes. | [account-overlay.md](development/account-overlay.md) |
| Your quizzes dashboard | Live | Your quizzes and questions, with a per-quiz page of attempts and per-question numbers. | [quiz-analytics-page.md](quiz/quiz-analytics-page.md) |

## Administration

| Feature | Status | What it is | Detail |
|---|---|---|---|
| Admin dashboard | Live (admins) | Every quiz, question, user and lookup list, with search and filters. Admins can edit, publish and unpublish any quiz. | [filtering.md](quiz/filtering.md) |
| Roles and permissions | Live | Role-based access with `resource:action` permissions, cached per user; only a SuperAdmin can grant SuperAdmin. | [user-role-management.md](auth/user-role-management.md) |
| Audit log | Live (admins) | Append-only record of who did what, to which record, from where. | [audit-logging.md](development/audit-logging.md) |
| Teacher requests and invite codes | Live (admins) | Approve Teachers; issue invite codes. | [teacher-role.md](auth/teacher-role.md), [invite-code-system.md](auth/invite-code-system.md) |
| Reports and moderation | Live | Signed-in players report a question or quiz (wrong answer, inappropriate image, offensive, spam, copyright). Wrong answers go to the author first; harmful reports go to moderators at once and hide the media — or hold the quiz — after 10 reporters. Moderators work from one queue in four lanes; reporters hear the outcome. | [moderation.md](media/moderation.md), [ADR 0034](adr/0034-moderation-hides-media-or-holds-a-quiz-never-one-question.md) |
| Statistics export | Not shipped | Quiz performance and question analytics as CSV, Excel or JSON; built, no route yet. | [statistics-export.md](quiz/statistics-export.md) |

## Platform and engineering

| Area | What's there | Detail |
|---|---|---|
| Architecture | Layered API: controllers → services → repositories; nothing outside a repository touches the database. Typed domain exceptions mapped to status codes in one place. | [CLAUDE.md](../CLAUDE.md) |
| Production | Frontend on Cloudflare Workers (static assets plus a small Worker); API and PostgreSQL in Docker on a Hetzner VPS behind host nginx; the VPS accepts traffic from Cloudflare only. | [production-topology.md](deployment/production-topology.md) |
| Security | Visibility checked at every entry point, answer keys readable only by owners, rate limiting, security headers, client IP resolved at nginx. | [ADR 0019](adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md), [rate-limiting.md](development/rate-limiting.md), [ADR 0027](adr/0027-the-client-ip-is-resolved-at-nginx.md) |
| Performance | Content-hashed build cached for a year; fast first paint for visitors (no server round trip before the page shows). | [frontend-worker.md](deployment/frontend-worker.md), [session-hint.md](auth/session-hint.md) |
| Background jobs | Hangfire: the abandoned-session sweep, account scrubbing after the grace period and its reminder emails, expired AI-quota reservations, unattached-image cleanup. | [session-lifecycle.md](quiz/session-lifecycle.md) |
| Tests and CI | Backend xUnit, frontend Vitest, Playwright end-to-end against the real API and its own PostgreSQL — all three gate `main` in GitHub Actions. Storybook + Chromatic for hard-to-reach UI states. | [testing.md](development/testing.md), [e2e-testing.md](development/e2e-testing.md), [ADR 0022](adr/0022-e2e-tests-run-against-the-real-api-and-their-own-database.md) |
| Decisions on record | Architecture decision records for every hard-to-reverse choice. | [adr/](adr) |

### Numbers (counted 2026-10-20)

| | Count | How to recount |
|---|---|---|
| Backend test cases | ~640 `[Fact]`/`[Theory]` | `grep -rE '^\s*\[(Fact\|Theory)' OxygenBackend/QuizAPI.Tests --include=*.cs \| wc -l` |
| Frontend unit tests | 323 in 47 files | `npx vitest run --project unit` |
| End-to-end tests | 11 in 5 specs | `grep -rhoE '^\s*test\(' e2e --include=*.spec.ts \| wc -l` |
| EF Core migrations | 35 | `ls OxygenBackend/QuizAPI/Migrations/*.cs \| grep -v -e Designer -e Snapshot \| wc -l` |
| ADRs | 31 | `ls docs/adr/*.md \| wc -l` |
| Public quizzes live | 12 | `totalItems` from `https://api.oxygenquiz.com/api/quiz/search?pageSize=1` |

## Not built yet

Decided or proposed, not in the app — say "planned", never "has".

- **Paid plans** — provider chosen (Paddle); tiers and prices open. [proposals/paid-plans-and-payments.md](proposals/paid-plans-and-payments.md)
- **Top 100** — a survey-based format like *Pointless*; no data source yet.
- **A public page per quiz and a sitemap** — design agreed, see Discovery above.
- **Guest play of an Associations board** — comes with the format's release. [associations.md](quiz/associations.md)
