/**
 * Client-side limits for the AI quiz flow.
 *
 * **The prompt text is no longer built here.** It lives in `AiPromptBuilder.cs` and is
 * fetched via `POST /api/quiz/ai-prompt` (see `api/generate-ai-quiz.ts`), so in-app
 * generation and the copy-paste fallback are guaranteed to send the same instructions.
 * `buildPrompt` used to live in this file and was deleted when that endpoint landed —
 * two hand-maintained copies of a tuned prompt drift silently, and the drift is invisible
 * because both copies keep working. See docs/quiz/ai-quiz-generation-plan.md §5.1.
 *
 * What remains is the numbers the UI needs in order to clamp inputs before sending them.
 * They are mirrored by `AiOptions` on the server, which is the actual gate — these exist
 * for fast feedback, not enforcement.
 */
export const AI_QUESTION_LIMITS = {
  minQuestions: 1,
  maxQuestions: 30,
  minTimeLimit: 5,
  maxTimeLimit: 300,
  /**
   * Soft cap for the copy-paste path — most LLM context windows start truncating well
   * before this. In-app generation truncates server-side at `Ai:MaxSourceChars` instead.
   */
  sourceWarningLength: 12000,
  /**
   * Ceiling for in-app generation, mirroring `Ai:MaxQuestionsPerGeneration`. Lower than
   * `maxQuestions` on purpose: one call asking for 30 degrades in quality and risks the
   * proxy timeout, while the copy-paste path has neither problem because the user's own
   * model handles it. See docs/quiz/ai-quiz-generation-plan.md §6.4.
   */
  maxGeneratedQuestions: 15,
} as const;
