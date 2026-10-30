import type { QuizQuestion } from "../types";
import { useQuiz } from "../Quiz-questions-context";
import { isDraftShape, toInPlaceDraft } from "../edit-copy";
import { ExistingQuestionCard } from "./existing-display-quiz-question-card/main-display-quiz-question-export";
import { NewQuestionCard } from "./new-display-quiz-question-card/main-display-quiz-question-card";
import { SavedQuestionNotice } from "./saved-question-notice";

/**
 * The one place that decides how the builder shows a question for editing — the desktop
 * builder's centre panel and the overview's editor dialog both render this, so they can't drift
 * (docs/quiz/quiz-editing.md, "Which questions the builder edits directly"):
 *
 * - **A draft** (written here, a copy, or already being edited in place) → the editor.
 * - **A saved question the rule allows** (yours, used by no other quiz, never answered) → the
 *   editor, on an in-place draft of it. No notice: as far as the author is concerned it is just
 *   their question.
 * - **Any other saved question** → read-only, under a notice naming the reason, with
 *   *Edit for this quiz* (a copy).
 */
export const BuilderQuestionEditor = ({
  question,
  onCopied,
}: {
  question: QuizQuestion;
  onCopied?: (copyId: number) => void;
}) => {
  const { editabilityOf } = useQuiz();

  if (isDraftShape(question)) return <NewQuestionCard question={question} />;

  const editability = editabilityOf(question.id);
  if (editability?.canEditInPlace) return <NewQuestionCard question={toInPlaceDraft(question)} />;

  return (
    <div className="flex flex-col gap-3">
      <SavedQuestionNotice questionId={question.id} editability={editability} onCopied={onCopied} />
      <ExistingQuestionCard question={question} />
    </div>
  );
};
