# The AI eval set — measuring generation quality before changing it

A fixed set of topics, run through the real prompt and the real model, parsed by the real
parser, then labelled by a human and scored. It answers one question: **when you change the
generation pipeline, did the questions get better?** Nothing else in the repo can answer that
today, which is why Phase 0 of
[`../docs/quiz/ai-question-accuracy-plan.md`](../docs/quiz/ai-question-accuracy-plan.md) comes
before Phases 1–5.

Full write-up of why it is shaped this way:
[`../docs/development/ai-eval.md`](../docs/development/ai-eval.md).

## The short version

An eval set is a **frozen input, a recorded output, and a human verdict**. Freeze the topics so
two runs are comparable. Record what came back so you can re-score without re-paying. Have a
person say *correct / wrong / ambiguous / time-sensitive* for each question, because no automated
check can — and the moment a model judges its own output, you are measuring the judge.

Two numbers come out, and they are **always reported together**:

- **Error rate** — of the questions an author would actually see, how many are wrong.
- **Yield** — of the questions you asked for, how many survived to be seen.

Either one alone can be improved by making the product worse. A pipeline that rejects everything
has a flawless error rate.

## What you have to do

1. **Edit [`topics.json`](./topics.json).** This is the part no tool can do for you. Twelve
   topics are there as a starting shape, six English and six Albanian — replace them with
   subjects your users actually generate, in the proportion they actually use. Keep the `id`s
   stable forever: they are how run 1 and run 7 are compared. Include deliberate traps; two are
   already in there (`Mercury` for ambiguity, a current-records topic for staleness).
2. **`cp eval/.env.example eval/.env`** and fill in an API account and a model API key.
3. **Start the API** (`dotnet run` in `OxygenBackend/QuizAPI`) — the harness fetches the prompt
   from it.
4. **Run the three stages** (below).
5. **Label `labels.jsonl`.** This is the slow part: roughly 120 questions, 1–2 hours. It is also
   the whole point.

## Running it

```bash
npm run eval:generate            # ~5 min: 12 topics, paced under the vendor's tokens/min ceiling
npm run eval:parse               # defaults to the run you just made
#  ... label eval/runs/<run-id>/labels.jsonl ...
npm run eval:score
```

`--run-id` is optional everywhere: without it, each command uses the most recently modified run.
Pass `--run-id=my-name` to `eval:generate` to name one, and to the others to pick an older one.

### If it says it is pausing

That is the pacer. The free tier allows 8,000 tokens a minute and one Albanian generation costs
about 2,700, so roughly three calls fit in a minute. The harness tracks what it has actually
spent and waits rather than collecting a 429 — and if one arrives anyway it honours the vendor's
retry delay instead of dropping the topic. Raise `EVAL_TPM_LIMIT` after upgrading your tier.

### Rerunning a few topics

```bash
npm run eval:generate -- --only=sq-01,sq-04 --run-id=retry-sq
```

Worth knowing why this exists. `topics.json` is ordered by language, so a failure that begins
partway down the list is ambiguous: "Albanian fails" and "everything after the sixth call fails"
look identical. Rerunning the failures from a cold start tells them apart — if they succeed
alone, it was rate limiting, not the topics.

### Comparing two runs

```bash
npm run eval:score -- --run-id=after --compare=before
```

The report prints a 95% Wilson interval beside every rate. **If the two intervals overlap, you
have not demonstrated a difference** — at 120 questions the interval around a 10% error rate is
roughly 6%–17%, so only large movements are real.

### The language-mode flag

```bash
npm run eval:generate -- --language-mode=inferred   # default: what production does today
npm run eval:generate -- --language-mode=pinned     # tells the model which language to write in
```

There is no language picker on the generate form, so in production `LanguageName` is never sent
and the model guesses the language from the topic string. `pinned` sends it. Running both and
comparing is how you find out what the missing picker costs.

## The three stages

| stage | what it does | what it reuses |
|---|---|---|
| `generate.ts` | Fetches the prompt from `POST /api/quiz/ai-prompt`, sends it to the vendor, saves the raw reply | **`AiPromptBuilder.cs`** — the harness has no prompt of its own and must never grow one |
| `parse.ts` | Runs the reply through `parseAiOutput`, writes a blind labelling file | **`parse-ai-output.ts` + `question-checks.ts`**, imported, not copied |
| `score.ts` | Reads your labels, writes `report.md` | — |

### Two things worth knowing

**It bypasses `ai-generate`, deliberately.** Quota reservation, the usage ledger, the audit write
and the HTTP error mapping do not change the questions that come back, and going around them
means a 12-topic run costs no quota slots and leaves no rows behind. The two things that decide
quality — the prompt and the model — are the production ones.

**Labelling is blind.** Rows are shuffled, carry an opaque id, and say nothing about which topic
or language mode produced them; the mapping is in `key.json`, which only the scorer reads.
Labelling while knowing which half came from the pipeline you are hoping to prove better is not
a measurement.

## Output

```
eval/runs/<run-id>/
  run.json        model, sampling, language mode, failures — the run's provenance
  raw/<id>.json   prompt sent and reply received, per topic
  parsed/<id>.json  the full ParseResult: kept, dropped with reasons, difficulty fallbacks
  stages.json     requested / returned / kept per topic — the yield numbers
  labels.jsonl    ← you fill this in
  key.json        rowId → topic, intended language, language mode (the scorer reads this)
  report.md       the result
```

`runs/` is gitignored. Force-add a run when it is the baseline a change is measured against.

## Labelling guide

One JSON object per line. Fill four fields and leave the rest alone:

| field | values | notes |
|---|---|---|
| `correctness` | `correct` / `wrong` / `ambiguous` / `time-sensitive` | `ambiguous` = more than one defensible answer, or the question cannot be answered as written. `time-sensitive` = true today, wrong next year. Both are distinct from `wrong`, and conflating them hides the two failures a grounded pipeline fixes differently. |
| `observedLanguage` | `English` / `Albanian` / `Spanish` / `French` / `mixed` / `other` | What language it **is**, not what it should be. The scorer compares it to the intended one, which is why you do not need to know that while labelling. |
| `fluency` | `1`–`4` | 1 = clumsy, reads as machine translation. 4 = a native speaker wrote this. Leave blank for a language you do not speak. |
| `note` | free text | Why, when the verdict is not obvious. These end up in the report. |

Label every row, including ones you are unsure about — an unlabelled row is silently excluded
from the denominator, which flatters the result.
