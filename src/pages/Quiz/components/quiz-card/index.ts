/**
 * Public surface of the quiz card.
 *
 * Callers import from `@/pages/Quiz/components/quiz-card`; the split between the card, its
 * derived data (`card-model.ts`) and its shared pieces (`card-parts.tsx`) is internal.
 */
export { QuizCard } from "./quiz-card";

// Re-exported for the callers that imported it from here before `secondsToMinutes` moved
// out into its own module. New code should import from `../quiz-duration` directly.
export { secondsToMinutes } from "../quiz-duration";
