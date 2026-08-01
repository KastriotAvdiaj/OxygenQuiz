# Proposal: make manual quiz creation atomic

**Status: open.** Nothing implemented. Written 2026-07-31.

Short version: the manual quiz-creation flow works, and its weaknesses are ones already solved once
in this codebase. The AI import path (`POST /quiz/ai-import`) is a strictly better design. The
proposal is to converge the manual path onto it rather than invent anything new.

---

## 1. What the manual flow does today

`create-quiz.tsx` → `handleQuizSubmit`:

1. Validate every question client-side; bail with a notification if any fail.
2. `Promise.all` over the questions. Each **new** (negative-id) question becomes its own `POST` to
   `/questions/multiplechoice` | `/truefalse` | `/typeTheAnswer` — the *same* endpoints the
   standalone question pages use. Existing questions contribute their id and cost nothing.
3. One `POST /quiz` (or `PUT` in edit mode) carrying `{questionId, timeLimit, pointSystem,
   orderInQuiz}` rows.

A 20-question quiz: **21 requests**, 20 concurrent, spanning two consistency domains with no
transaction across them.

## 2. What's wrong with it

### 2.1 It isn't atomic, and the code knows it

If step 3 fails, the questions from step 2 are already committed. The code handles this
deliberately — it detects the case and tells the user their questions were saved to the bank rather
than showing a generic error:

> "Quiz not created — your questions were saved"

That's a thoughtful piece of error handling, and as a *product* decision ("authored questions are
real work, don't throw them away") it's defensible. But it's a rationalisation of a constraint, not
a design goal anyone would choose from scratch. The user asked for a quiz; they got loose questions
and a consolation message.

The AI flow reached the opposite conclusion and says so in a comment: it's atomic "precisely because
its questions are throwaway". Both reasoned correctly from different premises. The manual premise is
the weaker one — a user who abandons after that message leaves permanent debris in their bank.

### 2.2 Partial failure inside step 2 is unhandled

This is the real defect, distinct from 2.1.

`Promise.all` rejects on the **first** rejection, but the other in-flight POSTs are not cancelled —
they keep going and keep committing. A failure on question 3 of 20 can leave anywhere from 0 to 19
orphan questions, with no record of which, no cleanup, and a generic "Failed to create quiz" from
the outer `catch`. The "your questions were saved" message doesn't even fire, because that branch
only runs when the *quiz* call fails.

The "category/language can't be Unspecified" rule (2026-07-31) makes this newly reachable: a quiz
with an Unspecified category now has **every** question POST rejected. Correct outcome, but it
arrives as a partial-failure storm rather than one clean message.

### 2.3 Request count scales with quiz size

21 round trips for 20 questions. On a slow connection that's the difference between "saved" and "did
it hang?". The AI path does the same work in one.

### 2.4 Ordering is implicit

`orderInQuiz` comes from the array index in the same map that fires the requests. It works, but
question order is a property of the quiz being assembled, and it currently rides inside a concurrent
question-creation loop.

## 3. The flow you already built

`POST /quiz/ai-import` → `QuizService.CreateAiQuizAsync` does all of it in **one database
transaction**: validates references up front, creates the quiz, creates each new question via its
typed set, links existing questions by id, writes the `QuizQuestion` join rows, commits once. It
already handles the mixed case — new questions inline, existing ones by id — which is exactly what
the manual builder needs.

It also demonstrates the failure mode you want: a bad difficulty id is rejected *before* anything is
written, with a specific message, instead of surfacing as an opaque FK error mid-write.

## 4. Proposal

**Generalise the AI import endpoint into the manual create path.**

1. Rename the concept — it isn't AI-specific, it's "create a quiz and its new questions atomically".
   `POST /quiz/with-questions`, with `/quiz/ai-import` kept as an alias, or just widen the existing
   route's contract.
2. Move category/language inheritance into the service, beside the check already there for the AI
   path. That closes the asymmetry noted in
   [`quiz/quiz-question-classification.md`](../quiz/quiz-question-classification.md): today the
   manual inheritance rule lives only in the client caller.
3. Point `handleQuizSubmit`'s non-AI branch at it, deleting the `Promise.all` + `createNewQuestion`
   block. The AI branch already builds the payload; the mapping is largely reusable.
4. **Decide explicitly what happens to authored questions on failure.** Atomic means rolled back,
   which contradicts today's "we saved your questions". Either accept that (the builder is for
   building quizzes; the bank is a separate, deliberate action) or add a "save these to my bank"
   affordance so it's a choice rather than a consolation prize.

**Cost:** meaningful. Touches the controller, `QuizService`, the DTOs and the builder's submit path,
and needs care around edit mode's versioning rules ([`quiz/quiz-editing.md`](../quiz/quiz-editing.md))
and image association.

**Benefit:** one request instead of N+1, no orphan questions, no partial-failure hole, one place
enforcing the inheritance rule, and one code path instead of two.

## 5. If the full change isn't worth it

Ranked by value per effort, each independently useful:

1. **Fix the partial-failure hole.** Replace `Promise.all` with `Promise.allSettled`; if any
   question failed, stop before creating the quiz and report which ones. Small, frontend-only, and
   it removes the worst current behaviour.
2. **Validate the quiz's category/language before firing any question requests.** With the new rule
   this is the most likely cause of a mass failure, and it's knowable up front.
3. **Leave the rest.** The N+1 and the non-atomicity are real but survivable; the silent partial
   failure is the one that will produce a confusing bug report.

## 6. One thing that is not a problem

Questions-first ordering is fine — you can't link a quiz to questions that don't have ids yet
without doing it server-side. The issue isn't the order of operations, it's that the two halves are
in different transactions and different requests.

---

## Related

- [`quiz/quiz-question-classification.md`](../quiz/quiz-question-classification.md) — the
  inheritance and Unspecified rules referenced throughout.
- [`quiz/ai-quiz-architecture.md`](../quiz/ai-quiz-architecture.md) — the atomic import this
  proposes to generalise (§10a covers why it's atomic).
- [`quiz/quiz-editing.md`](../quiz/quiz-editing.md) — versioning rules any change to the edit path
  must preserve.
