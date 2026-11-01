import { describe, expect, it } from "vitest";

import { parseAiOutput } from "../parse-ai-output";
import { parseContext } from "../__fixtures__/ai-quiz.fixtures";
import replies from "../__fixtures__/fact-quiz-replies.json";

/**
 * A fact quiz enters the same parser as a model's reply (docs/quiz/fact-quizzes.md), so the
 * parser's checks — giveaways, duplicate options, repeats, quotes not in the source — judge it
 * too. These are real replies from the server's `FactQuizBuilder` (every pack, both languages,
 * every question type, two seeds), recorded by dumping its output: if the builder and the parser
 * ever disagree, a question would silently vanish from a fact quiz, and this is where it shows.
 *
 * Re-record when a pack or a template changes: `FactQuizFixtureDump` in the C# tests says how.
 */
describe("fact quiz replies", () => {
  it.each(replies.map((r) => [`${r.pack} · ${r.language} · seed ${r.seed}`, r] as const))(
    "%s parses with nothing dropped",
    (_, reply) => {
      // As the app parses one (use-ai-quiz-draft.tsx): Monaco's capital is Monaco.
      const result = parseAiOutput(reply.payload, {
        ...parseContext,
        sourceText: reply.sourceText,
        answerMayBeInText: true,
      });

      expect(result.ok).toBe(true);
      expect(result.dropped).toEqual([]);
      expect(result.questions).toHaveLength(reply.count);
    },
  );

  it("a quote that isn't one of the facts is still caught", () => {
    const [reply] = replies;
    // The same reply, checked against a source that lacks its facts: every question goes.
    const result = parseAiOutput(reply.payload, { ...parseContext, sourceText: "Nothing about capitals here at all." });

    expect(result.questions).toHaveLength(0);
  });
});
