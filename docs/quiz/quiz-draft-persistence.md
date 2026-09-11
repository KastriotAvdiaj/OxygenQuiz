# Quiz draft persistence

Unfinished quiz creation survives a refresh, a closed tab and a crashed browser. Everything a
user has typed into the manual builder or the AI wizard is written to `localStorage` as they
work, and read back before the form's first paint.

This is deliberately the **local half** of a two-layer design. The server half is not built;
[what it would look like](#the-server-half-not-built) is at the bottom, along with the reason
a draft is not a `Quiz` row.

## What is kept

| Screen | Slot | Contents |
|---|---|---|
| Manual builder (`/quizzes/create-quiz`, `/quizzes/create`) | `quiz-create` | Quiz-level fields, plus every added question with its per-question settings |
| AI wizard, generate path (`.../ai/topic`) | `quiz-ai-topic` | Topic, Advanced options, and **the model's reply** |
| AI wizard, bring-your-own (`.../ai/own`) | `quiz-ai-own` | The same, plus the reply pasted into the box before it has been imported |

The AI reply — `payload` — is the reason the AI slots exist. The typing is cheap to redo; a
generation is not. It came out of the user's quota, and losing it to a stray refresh makes them
spend it twice for one quiz.

The two AI paths get **separate slots**, for the same reason `useAiQuizDraft` keeps nothing
across the trip between them: they are two attempts, not one, and a topic typed on the generate
page turning up on the bring-your-own page would be a surprise rather than a convenience.

The two dashboards **share** their slots. `/dashboard` and `/my-dashboard` are two doors onto
one builder for one person, so a draft started behind either is offered behind both.

## What is not kept, and why

- **Edit mode.** The quiz already exists on the server and has an optimistic-concurrency story
  to go with it ([`quiz-editing.md`](quiz-editing.md)). A local copy of a half-edited quiz
  would race the 409 that protects changes made elsewhere.
- **The builder rendered inside AI review.** The wizard above it already persists the payload
  those questions came from. Two snapshots of one quiz would mean two offers to restore it.
  `CreateQuizForm` disables its own draft whenever `aiImportMode` is set.
- **A generation in flight.** There is no job id to come back to, so a refresh spends the
  generation and returns nothing — which is what `useNavigationGuard` is armed for on that
  screen, and the one case where the honest answer is still "keep this tab open".
- **Anything untouched.** A form holding only its defaults stores nothing. See
  [ADR 0009](../adr/0009-a-restored-draft-is-announced-not-asked-about.md) for why that matters
  more than it sounds.
- **Images as bytes.** Only the `imageUrl` is stored. Uploads go to the media pipeline as they
  always have ([`question-media.md`](question-media.md)); a draft holds the URL, never a file.

## The code

| File | Job |
|---|---|
| `lib/drafts/draft-storage.ts` | Reads and writes `localStorage`. Owns the three rules below. |
| `hooks/use-draft-autosave.ts` | The write half: debounce, flush, discard. |
| `pages/…/Quiz/components/quiz-drafts.ts` | The snapshot shapes, their zod guards, and "is this worth keeping". |
| `pages/…/Quiz/components/draft-notices.tsx` | `RestoredDraftNotice` and `DraftSavedIndicator`. |
| `pages/…/Create-Quiz-Form/create-quiz-route.tsx` | Reads the manual draft and seeds the builder with it. |
| `pages/…/AI-Quiz/use-ai-quiz-draft.tsx` | Does both halves for the AI screens. |

## Three rules, in `draft-storage.ts` and nowhere else

**1. A slot is scoped to a user.** The key is `oxygenquiz:draft:<user id>:<slot>`.

`localStorage` is scoped to the *origin*, not to the signed-in account, and nothing clears it
at logout — the common exits are an expired token or a closed tab, not a logout click. Share
one key between accounts and the next person to sign in on a shared machine is offered the
previous one's half-written quiz, which they can then publish under their own name.
`use-lobby-connection.ts` guards the same hazard by comparing the stored username to the
current one; putting the id in the key instead leaves no comparison to forget. It also means a
draft survives a session expiry and comes back to the person who wrote it.

**2. A slot is versioned.** `QUIZ_DRAFT_VERSION` travels with every write, and a draft written
by any other version is dropped on read rather than hydrated into a form that has moved on.
Bump it when a snapshot stops round-tripping — a renamed field, a changed unit, a question
shape that no longer reads back. Adding an *optional* field is not a break.

**3. A slot expires.** `MAX_DRAFT_AGE_MS` is seven days. Past that, reads drop it.

Everything in that file is defensive. `localStorage` throws outright in some privacy modes, can
be full, and can hold whatever a previous build or a devtools session left there. A draft is a
convenience and never load-bearing, so every failure degrades to "there is no draft" rather
than to an error the user has to read.

Stored JSON is untrusted input, so it is validated before it reaches a form —
`parseManualQuizDraft` and `parseAiQuizDraft`, both zod. As with every client-side check in
this codebase, they mirror the API's rules and are never the rule itself: the API is still the
gate when the draft is finally submitted, and `validateAllQuestionsForSubmit` still runs first.

`parseManualQuizDraft` checks a stored question only as deeply as restoring it requires — an
id, a type, its text — and lets the rest through with `passthrough()`. A question is a union of
six shapes and re-describing all six here would be a second copy of `Create-Quiz-Form/types.ts`
that drifts out of step with it.

## Hydration — on the way in, never after

A draft is read **once**, synchronously, in the `useState` initialiser that seeds the form.
That is what makes the first render already contain the user's work: no frame where the form is
empty, no `reset()` racing the user's first keystroke, no Effect copying storage into state
after the fact. It is the same shape `theme-provider.tsx` uses for the stored theme.

For the manual builder this happens in `create-quiz-route.tsx`, which feeds the draft into
`initialValues` and `initialQuestions` — both props that already existed, for edit mode and for
the AI handoff. A draft is a third caller of the same two seams, which is why
`QuizQuestionProvider` needs no hydration path of its own.

For the AI screens `useAiQuizDraft` reads the slot at the top and every `useState` below opens
on the restored value.

## Writing — debounce, then flush

`useDraftAutosave` serialises the snapshot on every render and writes it 400ms after the last
change. Serialising each time is what lets an unchanged snapshot skip the write entirely: the
value is rebuilt on every render, so its identity says nothing and only its contents do.

A debounce alone loses the last few hundred milliseconds exactly when it matters — the tab is
closing — so the pending write is also flushed synchronously on:

- `visibilitychange` → `hidden`, the only signal that fires dependably on mobile,
- `pagehide`, which covers unload and the back/forward cache,
- unmount.

**`beforeunload` is deliberately not used here.** Browsers ignore its message, it does not fire
reliably on mobile, and `use-navigation-guard.ts` already owns it for the opposite job:
warning about work that *cannot* be saved.

**"Not this form's slot" is not the same as "nothing worth keeping".** A slot is shared by
every mount of a form, and `CreateQuizForm` also renders in edit mode and inside AI review,
where it keeps no draft. Those mounts pass `enabled: false`, which touches storage not at all.
Passing a `null` *value* there instead would **delete** the manual builder's draft — someone's
half-written quiz — the moment they opened an unrelated quiz to edit. `null` means the form
that owns this slot has nothing worth keeping, and only then does the slot get cleared.

The draft is cleared when the quiz is really created (through the hook, so the pending write is
cancelled too — otherwise it lands during the redirect and resurrects the draft a moment after
the quiz exists), when the user clicks **Start fresh**, and when a read finds it expired or
unreadable.

## What the user sees

Hydrate first, then say so: `RestoredDraftNotice` above the builder, **Start fresh** beside it,
and a quiet "Draft saved" by the submit button.
[ADR 0009](../adr/0009-a-restored-draft-is-announced-not-asked-about.md) is the argument for
announcing rather than asking, and for the three constraints that make it safe.

## Limits worth knowing

- **Per browser, per device.** Clearing site data clears drafts; a draft started on a laptop is
  not on the phone. That is the gap the server half would close.
- **One draft per slot.** Starting a second manual quiz overwrites the first. Multiple named
  drafts is a server-side feature, not a `localStorage` one.
- **Quota is shared with the origin.** A quiz draft is kilobytes, so a failed write means
  something else filled the store. It fails quietly — the user did not ask for this save — and
  the next write tries again.

## The server half (not built)

Local storage is the crash-proof layer: it writes in milliseconds and works offline. It is not
the durable one. A server draft would add exactly what the list above is missing — another
device, a cleared cache, more than one draft at a time — with the local layer staying in front
of it as the write-behind buffer, which is also what keeps it correct when the network is down.

**A draft is not a `Quiz`.** Whatever gets built should not reuse `POST /quiz`.
`createQuizInputSchema` requires at least one question and a real category, language and
difficulty; new questions do not exist as rows until submit; and `EnsurePublishableAsync`
exists to keep unclassified quizzes out of the catalogue. A half-filled form satisfies none of
that. Forcing it into the `Quizzes` table buys abandoned rows to garbage-collect and invariants
weakened everywhere they are relied on — including
[`quiz-visibility.md`](quiz-visibility.md), where `Draft` already means something specific and
useful ("created, not published"), not "half-typed".

The natural shape is its own entity holding an opaque document — `{ userId, slot, version,
document, updatedAt }` — with the client PUTting the same snapshot it already writes locally,
debounced at a few seconds, and expiry handled server-side. Two homes are plausible and neither
is free:

- **A `QuizDrafts` table in Postgres** with the document in a `jsonb` column. One migration, no
  new infrastructure, and it inherits the backup and access story everything else has.
- **A Mongo collection with a TTL index**, which is the more natural fit for an opaque document
  that expires. Note that **MongoDB is currently disabled** in this project
  ([`../data/mongodb.md`](../data/mongodb.md)) — choosing this means bringing back a piece of
  deployment infrastructure that was removed on purpose, which is a bigger decision than the
  feature warrants on its own.

## Tests

- `lib/drafts/__tests__/draft-storage.test.ts` — the three rules, plus the failure modes that
  are quiet rather than loud: another user's draft, an older version, an expired stamp, a clock
  that jumped backwards, unparseable JSON, and no signed-in user.
- `hooks/__tests__/use-draft-autosave.test.ts` — the debounce, the flush on hide and on
  unmount, the discard that must not be undone by the write it still had pending, and the
  `enabled: false` mount that must leave someone else's slot alone.
- `pages/…/Quiz/components/__tests__/quiz-drafts.test.ts` — "worth keeping" against a form
  holding only its defaults, and the parsers against wrong shapes.
