# 47. The wizard asks how hard

Date: 2026-11-15
Status: Accepted

Supersedes one consequence of [ADR 0014](0014-the-wizard-asks-for-the-brief-not-the-quiz.md):
"Difficulty is no longer asked for at all." The rest of ADR 0014 stands, and so does its test.

## Context

ADR 0014 took five fields off the AI wizard because the builder shows them on the next screen:
title, description, category, language, difficulty. For difficulty it said the quiz gets the
median-weighted rating and the builder is where it is changed.

That left the rating measuring nothing. The model was told only to give each question one of the
level names, with no level to aim at and nothing saying what a name means. The quiz's own rating
was the middle row of the difficulty table — the upper middle, so an instance with four ratings
labelled every generated quiz "Hard". On 2026-11-15 a general-knowledge quiz of plainly easy and
medium questions (*Which mountain is shown here?*, *The Nile empties into which sea?*) was labelled
Hard, and nothing in the system could have labelled it otherwise.

The reason difficulty was removed does not fit it. Title and category are **filing**: they describe
a quiz that exists, so asking after the questions are on screen is the better ask. How hard to make
the quiz is **brief**: the model needs it before it writes a word, exactly as it needs the question
count and the types — the three fields ADR 0014 kept.

## Decision

The wizard asks for a difficulty, as a slider over the instance's own ratings (easiest first),
shown with the other options under the topic box on both wizard pages. It starts on the middle
rating, the lower one when there are two.

That one answer is used twice:

- **The prompt aims at it** (`AiGenerationRequest.TargetDifficulty`). The level names are sent
  easiest first and the prompt says so; most questions are to be at the level, a few one step
  either side, none further. The prompt also says what the ends mean — what most adults know
  without studying the subject, against what only someone who has studied it would know — because
  a name alone is relative to nothing.
- **The quiz is rated with it.** The builder still shows the rating and still lets it be changed.

A name, like every lookup at that boundary, and only one the request itself lists; the server drops
anything else. No id crosses, and the model can still not create a rating.

## Alternatives

- **Rate the quiz from the model's own per-question ratings** (their weighted median). No new
  control, and the label would follow the content. But it only moves the problem: with nothing to
  aim at and no anchors the per-question ratings are the model's mood, and the author still has no
  way to *ask* for an easy quiz short of writing it in the instructions box.
- **A second model call to grade the finished quiz.** The most honest label, at the price of a
  call per quiz and a second opinion that can disagree with the first for no reason an author can
  see. Worth returning to if labels are still wrong with a target.
- **Leave it in the builder only.** What ADR 0014 did. It can correct the label; it cannot change
  the questions.

## Consequences

- The rating is what was **asked for**, not something measured. A model that writes easy questions
  under a "Hard" request still produces a quiz labelled Hard; the author reads the questions in the
  review and can change the rating or the questions. The eval is where to check how often that
  happens.
- An unmoved slider aims every quiz at the middle rating. Before, no quiz was aimed anywhere.
- ADR 0014's "thing to watch" is unchanged: a field goes on the wizard only when the model needs
  the answer before it writes. This is not a licence to put category back.
- The request hash includes the level, so the same brief at two levels is two requests.
