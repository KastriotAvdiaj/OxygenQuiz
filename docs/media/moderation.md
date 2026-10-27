# Reports, moderation and the picked catalogue

A player on question 7 of a community geography quiz sees that the "capital of Kosovo" answer
says Prizren. Another player on a different quiz sees an image nobody should have uploaded. Both
press **Report**. The first report goes to the quiz's author, who fixes the answer; the second
goes straight to the moderators, and if nine more people report the same image before anyone
looks, it hides itself behind a cover until someone does.

This is the safety half of the media work ([`media-pipeline.md`](media-pipeline.md) is the
storage half). Decided in [`../proposals/media-pipeline.md`](../proposals/media-pipeline.md)
§3.6–3.7 and §3.16–3.22; the decision that shapes it most is in
[ADR 0034](../adr/0034-moderation-hides-media-or-holds-a-quiz-never-one-question.md).

## 1. Reporting

**Who:** anyone signed in. A guest who presses Report is asked to sign in — a report needs someone
to hold to it, and to tell the outcome to.

**What:** a question (from the play screen, the results review and the multiplayer question view)
or a whole quiz (from the start dialog). Never your own content — edit it instead. Only something
you could have seen: a Public quiz (or a question you can read), or a quiz you have played — an
Unlisted one through its link, say. Anything else is the same 404 as an id that doesn't exist, so a
report can't map which ids hold someone's drafts (`CanReachQuizAsync` / `CanReachQuestionAsync`;
*Show anyway* checks the same).

**Once:** one open report per person per question or quiz. A second is refused with *You've
already reported this* (enforced by `IX_ContentReports_OneOpenPerQuestion` / `…PerQuiz`, filtered
unique indexes on open reports).

**Why:**

| Reason | Text | Goes to |
|---|---|---|
| Wrong answer or information | required — "what's the correct answer?" | the author first |
| Inappropriate image or audio | optional | moderators, **Urgent** |
| Offensive or hateful | optional | moderators, **Urgent** |
| Spam or nonsense | optional | moderators |
| Copyright | optional | moderators |
| Other | required | moderators |

*Inappropriate* and *Offensive* are the **harmful** reasons (`ContentReport.IsHarmful`): they reach
the Urgent lane at the first report and are the only ones that can hide anything on their own.

The client checks the same rules for fast feedback (`submitReportSchema` in
`src/features/reports/api/reports.ts`); `ContentReportService.SubmitAsync` is the gate.

## 2. Wrong answers go to the author first

Most reports on a quiz app will be "that's wrong". The author knows their quiz best, so a
wrong-answer report:

1. notifies the author with the reporter's text (never the reporter's name);
2. appears on the author's **My Dashboard → Reports** (`/my-dashboard/reports`);
3. waits for the author to answer **I fixed it** (`Fixed`) or **It's not a mistake** (`NotAMistake`,
   with a reason the reporters see);
4. reaches the moderators' **Needs attention** lane if the author hasn't answered after
   `Moderation:AuthorEscalationCount` reports (5) or `Moderation:AuthorWindowDays` (7) days.

Wrong-answer reports never hide anything. A quiz written by staff (a **house** quiz) skips the
author step: the house is the author, so its reports go straight to the queue.

## 3. Hiding

Nothing could hide content before this. Removing one question from a quiz would change its
question count, its scoring and every game in progress, and a question can be in several quizzes —
so there are exactly two things that hide ([ADR 0034](../adr/0034-moderation-hides-media-or-holds-a-quiz-never-one-question.md)):

**The media is hidden** (`Question.MediaHiddenAt`). The question still plays; its image or clip sits
under a cover — *Image hidden — reported as inappropriate* — with **Show anyway** for signed-in
players. Guests (some may be minors) see the cover with no way past it, and the server enforces
that half: play payloads (`CurrentQuestionDto`, `UserAnswerDto`, the multiplayer
`RoundQuestionView`) carry `mediaHidden: true` and **no URL**; Show anyway fetches it from
`GET /api/media/hidden/question/{id}`, which needs an account. Authoring views (the owner's and
admins' question lists) carry the URL, and show the same cover.

**The quiz is held** (`Quiz.ModerationHeldAt`). A moderation state of its own, not the owner's
`Status` — otherwise the owner could simply republish it. A held quiz is out of the catalogue, its
listing page and the sitemap; it can't be opened by id, by share link or in a lobby by anyone but
its owner (and admins, read-only). The owner sees it with an **Under review** badge and banner.
Like visibility, the hold is enforced at each entry point (ADR 0019):

| Entry point | Held quiz |
|---|---|
| Catalogue search (`SearchQuizzesAsync`), paged public list (`GetPublicQuizzesAsync`) | left out |
| Listing `/q/:id` and the sitemap (`GetQuizListingAsync`, `GetQuizListingsAsync`) | 404 / left out |
| `GET /api/quiz/{id}` | owner and admins only |
| Share link (`GetQuizByShareTokenAsync`) | 404 |
| Starting a session (`QuizPlayAccess.IsPlayAuthorized`), guest sessions | owner only |
| Hosting a lobby (`CanHostQuizAsync`) | owner only |

Pinned by `QuizAPI.Tests/Moderation/HoldAndPickedEntryPointTests.cs`, one test per row.

**Automatically, at `Moderation:AutoHideThreshold` (10) distinct reporters** of a harmful reason:

- *Inappropriate image or audio* on a question → the media is hidden;
- *Offensive* on a question → every quiz the question is live in is held;
- any harmful reason on a quiz → the quiz is held.

10, not 3, because three friends shouldn't be able to take down a quiz they dislike. The cost —
a bad image on a rarely played quiz may never reach 10 — is covered by moderators seeing it at the
first report.

## 4. The moderators' queue

`/dashboard/reports` (permission `moderation:manage`). Reports are grouped per reported thing,
most-reported first, in four lanes:

| Lane | What's in it |
|---|---|
| **Urgent** | anything with a harmful report; anything auto-hidden |
| **Needs attention** | copyright, spam, other; wrong-answer reports the author left (5 reports or 7 days) |
| **With author** | wrong-answer reports still in the author's window — visible, nothing to do yet |
| **Resolved** | history |

Every action is on that page, so a decision never needs another screen:

| Action | Effect |
|---|---|
| **Uphold** | resolves every open report on it; optionally *remove the media* and/or *hold the quiz*; an upheld harmful report on a picked quiz unpicks it |
| **Reject** | resolves them as nothing wrong — and **undoes** whatever the reports hid (media shown, holds released) |
| Hide / Show media | the cover, by hand |
| Hold / Release quiz | the hold, by hand |
| Pick / Unpick | §5 |
| **Remove media** | the file leaves every question and cover using it, is deleted from storage, and its row stays as a tombstone (`MediaAsset.RemovedAt`) so the same bytes can't be uploaded again. Asks first; not undoable |

Every action is written to the audit log (`moderation.*`). Everyone who reported is notified of
the outcome either way — *led to a change* or *left as it is*.

## 5. Picked and community quizzes

The public catalogue has two halves:

- **Picked** (`Quiz.IsPicked`) — the default view, and the only quizzes in the sitemap and indexed
  by search engines. A quiz gets there three ways:
  - **House.** Quizzes made by staff (an Admin or SuperAdmin at creation — a role check,
    `ICurrentUserService.IsAdmin`) are **house** quizzes (`IsHouse`) and picked at creation
    (`QuizHouse.Stamp`). No badge.
  - **Auto-pick.** A creator holding `quiz:autopick` has their quizzes picked at creation too, but
    they aren't house, so they carry the badge. It's a permission, not a role: a SuperAdmin makes a
    role (say "Trusted Creator") in the dashboard, ticks `quiz:autopick` in the permission matrix,
    and gives the role to people. Admin and SuperAdmin hold it as seeded. It covers *their own*
    quizzes only — picking anyone else's is `quiz:pick`.
  - **Picked by hand.** Anyone holding `quiz:pick` (Admin and SuperAdmin) picks a community quiz
    from the ⋯ menu of its row in **Dashboard → Quizzes**, the ⋯ menu on its dashboard quiz page,
    or the report queue; its author is notified. Only a Public quiz that isn't held can be picked.

  **An edit takes a quiz back out** ([ADR 0036](../adr/0036-an-edit-takes-a-quiz-out-of-the-picked-catalogue.md)):
  when someone without `quiz:autopick` changes a picked quiz's content — its fields, cover,
  questions or board — it is unpicked (`QuizHouse.UnpickForEdit`), and a moderator picks it again.
  Publishing or unpublishing alone keeps the pick. Editing a question from the question bank
  unpicks every picked quiz it is live in (`IQuestionRepository.UnpickQuizzesContainingAsync`), as
  it changes them all. Both builders say so before the author saves (`PickedEditNotice`). An
  upheld harmful report unpicks too (§4).
- **Community** — every other Public quiz, behind a switch on the catalogue. The first switch shows
  a one-time notice that these quizzes haven't been checked (remembered per browser). A community
  quiz still has its listing page, served `noindex` by the Worker (`isIndexable` in
  `worker/listing.js`).

A picked *community* quiz carries a badge. **Its text, "Oxygen Pick", is one display string**
(`PICK_BADGE_LABEL` in `src/features/reports/components/pick-badge.tsx`), never the code's name for
the concept — the brand may change. A house quiz carries no badge: everything in the main
catalogue would have one.

`GET /api/quiz/search?scope=picked|community` selects the half (`CatalogueScope.cs`); no scope means
both, which is what the lobby's quiz picker and older callers get.

## 6. API

| Method | Route | Who |
|---|---|---|
| POST | `/api/reports` | signed in |
| GET | `/api/reports/received` | signed in — wrong-answer reports on your own content |
| POST | `/api/reports/respond` | the author — `Fixed` / `NotAMistake` |
| GET | `/api/moderation/reports?lane=` · `/api/moderation/reports/counts` | `moderation:manage` |
| POST | `/api/moderation/resolve` | `moderation:manage` |
| POST | `/api/moderation/questions/{id}/hide-media` · `show-media` | `moderation:manage` |
| POST | `/api/moderation/quizzes/{id}/hold` · `release` | `moderation:manage` |
| POST | `/api/moderation/quizzes/{id}/pick` · `unpick` | `quiz:pick` |
| POST | `/api/moderation/media/{assetId}/remove` | `moderation:manage` |
| GET | `/api/media/hidden/question/{id}` | signed in |

All three permissions (`moderation:manage`, `quiz:pick`, `quiz:autopick`) are seeded for Admin
(SuperAdmin passes every check); `quiz:autopick` is checked at quiz creation and edit, not on a route.

## 7. Files

**Backend:** `Models/Moderation/ContentReport.cs`; `Repositories/ModerationRepository.cs`;
`Services/Moderation/ContentReportService.cs` (submit, auto-hide, the author's side, options) and
`ModerationService.cs` (lanes, every moderator action); `Controllers/Moderation/ModerationControllers.cs`;
`Common/CatalogueScope.cs`, `Common/QuizHouse.cs`, `Common/QuizPlayAccess.cs`; migration
`AddReportsAndModeration` (which also marks every existing quiz owned by an Admin or SuperAdmin as
house and picked); `AddQuizAutoPickPermission`.

**Frontend:** `src/features/reports/` (API, report dialog, badge, the shared target summary);
`src/common/QuestionMedia.tsx` (the cover); `src/pages/Dashboard/Pages/Reports/ModerationReports.tsx`;
`src/pages/UserDashboard/ReceivedReports.tsx`; `src/pages/Quiz/components/catalogue-scope-switch.tsx`;
the pick item in both quiz ⋯ menus (`Data-Table-Columns/columns.tsx`, `quiz-view/quiz-actions-menu.tsx`).

**Tests:** `QuizAPI.Tests/Moderation/` (`ModerationTests`, `HoldAndPickedEntryPointTests`, `AutoPickTests`),
`Security/ModerationEndpointTests`; `src/features/reports/__tests__/reports.test.tsx`;
`worker/__tests__/listing.test.js` (`isIndexable`).

## 8. Not done

- **No automated classifier.** Nudity/gore detection (SafeSearch, Rekognition, Sightengine) is paid
  and waits for revenue (proposal §3.7). The legal floor at launch is Cloudflare's CSAM Scanning
  Tool on the media domain — a dashboard setting, in [`production-topology.md`](../deployment/production-topology.md), "Media — R2 and free images".
- **A quiz's cover can't be hidden on its own** — an inappropriate cover holds the quiz (or is
  removed). Covers are on catalogue cards everywhere; a covered card would still advertise it.
