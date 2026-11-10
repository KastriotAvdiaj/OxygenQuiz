import type { QuestionDifficulty } from "@/types/question-types";
import { isUnspecifiedLookup } from "@/pages/Dashboard/Pages/Question/Entities/lookup-visibility";
import { AI_QUESTION_LIMITS } from "../../../AI-Quiz/prompt";

/**
 * Paste questions (docs/quiz/pasted-questions.md): the format a user hands their own AI, and the
 * cap on one paste. Parsed by `parseAiOutput` — the own-AI path's parser — so the shape here is the
 * one `aiQuestionSchema` reads; keep the two together when either changes.
 */

/** The most questions one paste adds — the own-AI path's ceiling. */
export const MAX_PASTED_QUESTIONS = AI_QUESTION_LIMITS.maxQuestions;

/** The longest reply the box accepts; ~30 questions with explanations fit with room to spare. */
export const MAX_PASTE_CHARS = 60_000;

/**
 * The instructions to copy into your own AI. Built here, not fetched: there's nothing for the
 * server to add, and no AI on our side is involved. Difficulty names come from the live lookup,
 * so the reply matches rows that exist; anything else falls back to Unspecified.
 */
export const buildPasteFormat = (difficulties: readonly QuestionDifficulty[]): string => {
  const names = difficulties
    .filter((d) => !isUnspecifiedLookup(d.level))
    .map((d) => `"${d.level}"`)
    .join(", ");

  return `Turn the questions below into JSON for a quiz app. Reply with JSON only — no other text.

{
  "questions": [
    {
      "type": "MultipleChoice",
      "text": "What is the capital of Kosovo?",
      "answerOptions": [
        { "text": "Prishtina", "isCorrect": true },
        { "text": "Prizren", "isCorrect": false },
        { "text": "Peja", "isCorrect": false },
        { "text": "Gjakova", "isCorrect": false }
      ],
      "allowMultipleSelections": false,
      "difficulty": ${names ? names.split(", ")[0] : '"Easy"'},
      "explanation": "Prishtina is Kosovo's capital and largest city."
    },
    {
      "type": "TrueFalse",
      "text": "The Danube flows into the Black Sea.",
      "correctAnswer": true
    },
    {
      "type": "TypeTheAnswer",
      "text": "Which planet is known as the Red Planet?",
      "correctAnswer": "Mars",
      "acceptableAnswers": [],
      "isCaseSensitive": false
    }
  ]
}

Rules:
- "type" is exactly one of "MultipleChoice", "TrueFalse", "TypeTheAnswer".
- MultipleChoice: 2 to 4 answer options, at least one with "isCorrect": true; "allowMultipleSelections" is true only when more than one is correct.
- TrueFalse: "correctAnswer" is true or false (not a string).
- TypeTheAnswer: "correctAnswer" is a short word or phrase; "acceptableAnswers" lists other spellings you'd accept.
${names ? `- "difficulty" is optional; if given, exactly one of: ${names}.\n` : ""}- "explanation" is optional: one or two sentences a player reads after answering.
- Don't put the answer in the question's text.
- At most ${MAX_PASTED_QUESTIONS} questions.

My questions:
`;
};
