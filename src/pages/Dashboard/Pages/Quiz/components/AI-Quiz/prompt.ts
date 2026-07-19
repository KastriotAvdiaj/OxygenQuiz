import { QuestionType } from "@/types/question-types";

/**
 * Builds the prompt the user copies into an external LLM (ChatGPT / Claude / Gemini).
 *
 * Design rules (see docs/quiz/ai-quiz-creation-plan.md §5):
 *  - The prompt NEVER contains entity IDs. Categories and languages are not mentioned at
 *    all — generated questions inherit those from the quiz the user already configured.
 *  - The only entity vocabulary passed in is the difficulty NAMES, which are a small
 *    fixed set. They are resolved back to IDs on import by strict name match.
 *  - The model is asked for strict JSON so `parse-ai-output.ts` can validate it.
 *
 * The prompt text is intentionally never displayed in the UI — it is copy-only.
 */

export const AI_QUESTION_LIMITS = {
  minQuestions: 1,
  maxQuestions: 30,
  minTimeLimit: 5,
  maxTimeLimit: 300,
  /** Soft cap — most LLM context windows start truncating well before this. */
  sourceWarningLength: 12000,
} as const;

export interface BuildPromptOptions {
  /** The raw source material the quiz should be based on. */
  sourceData: string;
  /** How many questions to generate. */
  questionCount: number;
  /** Which question types the model may use. At least one. */
  allowedTypes: QuestionType[];
  /** Names (not IDs) of the difficulties that exist in the DB. */
  difficultyNames: string[];
  /** Optional free-text steer, e.g. "focus on dates" or "exam style". */
  extraInstructions?: string;
}

const TYPE_SPECS: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: `  - "MultipleChoice" also requires:
      "answerOptions": array of 2 to 4 objects, each { "text": string, "isCorrect": boolean }
      "allowMultipleSelections": boolean (true only if more than one option is correct)
    At least one option MUST have "isCorrect": true.`,
  [QuestionType.TrueFalse]: `  - "TrueFalse" also requires:
      "correctAnswer": boolean (true or false, not a string)`,
  [QuestionType.TypeTheAnswer]: `  - "TypeTheAnswer" also requires:
      "correctAnswer": string (the canonical answer, kept short — a word or short phrase)
      "acceptableAnswers": array of strings (other spellings/synonyms you would accept; may be empty)
      "isCaseSensitive": boolean (almost always false)
      "allowPartialMatch": boolean`,
};

export const buildPrompt = ({
  sourceData,
  questionCount,
  allowedTypes,
  difficultyNames,
  extraInstructions,
}: BuildPromptOptions): string => {
  const typeList = allowedTypes.map((t) => `"${t}"`).join(" | ");
  const difficultyList = difficultyNames.map((d) => `"${d}"`).join(" | ");
  const typeSpecs = allowedTypes.map((t) => TYPE_SPECS[t]).join("\n");

  return `You are a quiz-generation engine. Read the SOURCE MATERIAL at the end of this message and produce EXACTLY ${questionCount} quiz question(s) based ONLY on it.

OUTPUT RULES — follow these precisely:

1. Respond with a SINGLE JSON object and NOTHING else. No explanation, no commentary, no markdown code fences.

2. The object must have exactly this shape:

{
  "questions": [
    {
      "type": ${typeList},
      "text": string,
      "difficulty": ${difficultyList},
      "pointSystem": "Standard" | "Double" | "Quadruple",
      "timeLimitInSeconds": integer between ${AI_QUESTION_LIMITS.minTimeLimit} and ${AI_QUESTION_LIMITS.maxTimeLimit}
    }
  ]
}

3. Depending on "type", each question needs these ADDITIONAL fields:
${typeSpecs}

4. "difficulty" MUST be exactly one of: ${difficultyList}. Do not invent difficulty names, do not translate them, do not use any other value.

5. Do NOT output a category or a language for any question. Those are handled outside this prompt. Any category/language fields you add will be ignored.

6. Scale "pointSystem" and "timeLimitInSeconds" with how hard the question is, so the quiz ramps up: easier recall questions should be "Standard" with a short time limit, while harder reasoning or synthesis questions should be "Double" or "Quadruple" with more time.

7. Write every question in the SAME LANGUAGE as the source material.

8. Base every question strictly on the source material. Do not invent facts that are not present in it. Make sure the answer you mark as correct is actually correct according to the source.
${extraInstructions?.trim() ? `\n9. Additional instructions from the user: ${extraInstructions.trim()}\n` : ""}
SOURCE MATERIAL:
"""
${sourceData.trim()}
"""`;
};
