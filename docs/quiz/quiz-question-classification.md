# Quiz question classification

How a question authored inside the quiz builder gets its **category**, **language** and
**difficulty**, and why the seeded **"Unspecified"** lookup is hidden from most users.

## The rule

A quiz and the questions created inside it share one classification:

- **Category and language are inherited from the quiz.** A new question does not have its own
  category/language pickers in the builder — it takes the quiz's. This keeps a quiz and its
  questions filed consistently and means the question bank never accumulates mystery entries.
- **Difficulty is left Unspecified.** A quiz mixes questions of varying difficulty, so each
  question's difficulty is set on its own later (or left Unspecified). The builder never forces
  a quiz-wide difficulty onto its questions.

## No question may be stored as Unspecified

**Category and language are required on every question, however it was created.** "Unspecified" is
an internal default the app assigns while a question is being drafted — it must never be what a
question is *persisted* as. A question filed under Unspecified is invisible to category and language
filters, so it can't be found again in the bank; enough of them and the bank stops being usable.

**Difficulty is exempt** and may stay Unspecified indefinitely: it genuinely isn't known until
someone rates the question, and nothing depends on it being set.

> **A quiz is governed by a second, separate rule.** Everything in this section is about
> *questions*. A quiz may hold Unspecified in any of its three lookups — but only while it is
> Draft or Unlisted; publishing requires all three to be real, difficulty included. See
> [quiz-visibility.md](quiz-visibility.md) § "Publishing requires a full classification". The
> two rules have different reasons (bank findability vs. catalogue findability) and different
> scopes, which is why they're enforced in different places.

Enforced in three places, deliberately:

| Layer | What it does |
|---|---|
| **API** (`QuestionService.ValidateClassificationAsync`) | The gate. Runs on all three create and all three update paths; throws `AppValidationException` → **400**. `QuizService`'s AI import runs the same check against the *quiz's* category/language, since its questions inherit them. |
| **Client, at submit** (`handleQuizSubmit`) | Refuses a quiz whose category or language is Unspecified *before* anything is written, whatever put the value there. Added 2026-09-10 with the leak below; on the manual path it is also what stops one empty dropdown becoming a burst of doomed question POSTs. |
| **Client, in the form** (the three `create*QuestionInputSchema` zod schemas) | Fast feedback while typing. Category and language are required (`.positive()`, no default); difficulty still defaults to `UnspecifiedIds.difficultyId`. |

The submit gate exists because the zod schemas cannot express this rule: they see an *id*, and
`.positive()` is perfectly happy with the seeded row's. Both client layers are mirrors and neither
is the rule — the API is still the gate.

The rule is matched **by name**, case-insensitively — not by id. The seeded rows aren't guaranteed
to land on the same ids in every environment, which is the same reason
`lookup-visibility.ts` matches by label on the frontend. Server-side the name and the match live in
`QuizAPI.Common.LookupDefaults` — one definition, read by `QuestionService`, `QuizService` and
`AiGenerationService`. It was previously a private const in the first two, each documented as
"kept in sync" with the other; the third caller is what made that arrangement untenable rather
than merely untidy.

> **Existing data is untouched.** The rule applies to writes from this point on; questions already
> stored as Unspecified keep working and still play. They will, however, have to be given a real
> category and language the next time someone edits them — the update path validates too.

This mirrors the AI flow, whose invariant #2 already states "category and language are always
inherited from the quiz, never `Unspecified`" — see
[ai-quiz-architecture.md](ai-quiz-architecture.md). Manual and AI creation now classify their
questions the same way.

## Where it happens

| Flow | Mechanism |
|------|-----------|
| **Manual** | Each new (negative-id) question is its own POST to the shared per-type endpoint — the builder uses the *same* hooks and endpoints as the standalone question pages, fired concurrently via `Promise.all`, then one further call creates the quiz. At save time each question is passed through `inheritQuizClassification(question, values)` (`src/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/inherit-quiz-classification.ts`), which overwrites `categoryId`/`languageId` with the quiz's values and leaves `difficultyId` untouched. Because the endpoint is shared, the *inheritance* rule lives entirely in this caller — the endpoint only enforces "not Unspecified". |
| **AI** | Category and language live only at the quiz level of the `/quiz/ai-import` payload; each question carries just a `difficultyId`. The backend applies the quiz's category/language to every created question. |

Inheritance is applied **at save time**, not when the question is added. The quiz is the single
source of truth, so this is correct even if the quiz's category or language changed after the
question was authored.

New questions still start from the seeded "Unspecified" ids (`UnspecifiedIds` in the builder's
`constants.ts`) as a safe default; category and language are simply overwritten before the
question is persisted.

## How it used to leak in (found 2026-09-10, fixed)

Everything above was true, and an AI-generated quiz still arrived in the builder with
**"Unspecified" showing in the category dropdown, selectable, and fatal on save**. Three correct
mechanisms composed into a wrong one:

1. `use-ai-quiz-draft.tsx` sent the model every lookup name it had —
   `categories.map(c => c.name)` — so **"Unspecified" was in the vocabulary the model was invited
   to choose from.** Nothing filtered it, on either side of the wire.
2. `suggestedCategoryId` resolved the model's answer **by name against that same list**. So
   "Unspecified" did not fail to resolve; it resolved *correctly*, to the seeded row, and
   travelled on as an ordinary id.
3. It became `initialValues.categoryId` for the builder — and `CategorySelect`'s form mode keeps
   the Unspecified option in the list when **it is already the field's value** (see the exception
   below). The field showed a real choice, correctly, because by then it was one.

Submitting hit `QuizService.CreateAiQuizAsync` and came back *"Pick a category for this quiz — its
questions inherit it, and "Unspecified" isn't allowed on a question."* — the right message, at the
worst possible moment, about a dropdown the user had no reason to distrust.

**What closed it, and where.** The display exception was left exactly as it is: it is load-bearing,
and it was not the bug. The leak was closed upstream, at each of the first two steps.

| Where | Change |
|---|---|
| `use-ai-quiz-draft.tsx` (`buildInput`) | Unspecified is filtered out of `categoryNames`, `languageNames` **and** `difficultyNames`. A vocabulary offered to the model contains only answers we will accept. |
| `use-ai-quiz-draft.tsx` (`suggestedCategoryId`, `suggestedLanguageId`) | Refuse it **by name**, returning `null`. A resolver is where a proposal gets rejected, not only translated. |
| `use-ai-quiz-draft.tsx` (`defaultDifficultyId`) | Excluded from the median-weight pick. Seeded at weight 0 it sorts first, and on a small lookup table it could win the median and quietly hand the quiz an unpublishable difficulty. |
| `AiGenerationService.CleanNames` | Drops it again server-side. The prompt is a server-side contract; a caller is not where it is enforced. |
| `handleQuizSubmit` | The submit gate in the table above — closes it for any *other* route to the same value, including a quiz edited from data stored before these rules existed. |

Returning `null` from the resolver is what makes this a good outcome rather than a different
error: `canPlaceQuestions` goes false, `needsConfirmation` fires, and `ConfirmDetailsCard` asks for
the one missing field while keeping the generated questions. That path already existed for the case
"the model named a category we don't have" — the fix routes this case into it. The card's wording
had to fork, though: "Unspecified" *is* one of your categories, so the existing note would have
been a plain untruth about the user's own data. It was refused for being a placeholder, not for
being unknown.

The decision and the alternatives are recorded in
[ADR 0007](../adr/0007-a-forbidden-lookup-is-never-offered.md).

> **The general shape, worth recognising elsewhere.** No layer here was wrong. The prompt offered
> what it was given, the resolver resolved what it was asked, and the select displayed the value it
> held. The defect was that **nothing in the chain owned the question "may this value be assigned?"**
> — the one place that did own it was the API, three steps too late to be an affordance.

## Hiding the "Unspecified" lookup

The backend seeds an "Unspecified" row for each lookup — category, difficulty and language (see
`OxygenBackend/QuizAPI/Services/DbSeeder.cs`). It is an internal default the app assigns
automatically, not a meaningful choice for an end user.

`src/pages/Dashboard/Pages/Question/Entities/lookup-visibility.ts` centralises this:

- `isUnspecifiedLookup(label)` — matches the row **by name** (case-insensitive), not a hard-coded
  id, so it stays correct regardless of row ordering across environments.
- `useCanSelectUnspecifiedLookup()` — returns `true` only for `Admin` / `SuperAdmin`.

The shared `CategorySelect`, `DifficultySelect` and `LanguageSelect` components use these to drop
the "Unspecified" option from their dropdowns for everyone except catalog admins (who still need
it to curate content). This applies in both the form and filter variants. Hiding the option is
purely a selection concern — it never changes a value already stored on a question or quiz.

### Selecting it: closed (was a known rough edge)

`useCanSelectUnspecifiedLookup` used to offer "Unspecified" to admins in the **form** dropdowns
too, while the API rejected it — an admin who picked it got a 400 instead of a disabled option.
That gap is closed. `CategorySelect` and `LanguageSelect` now keep two lists:

| Mode | Offers "Unspecified"? |
|---|---|
| `filter` | Admins only, as before. Filtering *by* Unspecified is how you find the rows that still need classifying. |
| `form` | **Nobody** — admins included. The API rejects it on every question path and it blocks publishing a quiz, so offering it is offering a dead end. |

`DifficultySelect` is unchanged in both modes: an Unspecified difficulty is legal on a question
and is the default a new one starts from, so it has to remain assignable. (It does block
publishing the *quiz* — see [quiz-visibility.md](quiz-visibility.md) — but that's a property of
the quiz, not a reason to remove the option.)

> **The one exception, and why it exists.** Form mode keeps "Unspecified" in the list when it is
> **already the field's value**. A Radix `Select` whose `value` matches no `SelectItem` renders
> its placeholder — often nothing at all — so filtering the option out of a control still holding
> that id produces a blank trigger over a value that is silently still set. That exact failure
> shipped once already on the per-question time-limit dropdown. The rule generalises: **never
> remove the option a control is currently displaying.**
>
> This exception is what made the leak above visible, and it is worth being clear that it was not
> the cause. Removing it would have traded a bad option for a blank field over the same bad value —
> strictly worse, and it would still be there in every quiz stored under Unspecified before these
> rules existed. So the exception stays, and the value is stopped from arriving. It follows that
> **seeing "Unspecified" in a form dropdown is a signal, not a permission**: it means the field
> already holds it, and something upstream put it there.
