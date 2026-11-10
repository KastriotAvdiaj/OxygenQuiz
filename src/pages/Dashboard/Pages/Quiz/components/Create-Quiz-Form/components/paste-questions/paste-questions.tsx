import { useState } from "react";
import { ClipboardPaste } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { parseAiOutput, type DroppedQuestion } from "../../../AI-Quiz/parse-ai-output";
import { UnspecifiedIds } from "../../constants";
import { useQuiz } from "../../Quiz-questions-context";
import { buildPasteFormat, MAX_PASTE_CHARS, MAX_PASTED_QUESTIONS } from "./paste-format";
import { PasteQuestionsView } from "./paste-questions-view";

/**
 * Paste questions, beside *Add a question* in the builder (docs/quiz/pasted-questions.md). Open to
 * every signed-in author: the AI is the author's own, so nothing here costs us anything, and what
 * it adds is Private, like every builder question.
 *
 * Category and language aren't read from the reply: the builder files every new question under
 * the quiz's own at save time (inherit-quiz-classification.ts), so they start Unspecified here.
 */
export const PasteQuestions = ({
  outerClassName,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  outerClassName?: string;
  /** Controlled from outside — the overview opens it from the *Add a question* menu. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) => {
  const { addPastedQuestions } = useQuiz();
  const { addNotification } = useNotifications();
  const { data: difficulties = [] } = useQuestionDifficultyData({});

  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = (next: boolean) => (onOpenChange ?? setOwnOpen)(next);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dropped, setDropped] = useState<DroppedQuestion[]>([]);
  const [copied, setCopied] = useState(false);
  const [formatToCopyByHand, setFormatToCopyByHand] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setError(null);
    setDropped([]);
    setCopied(false);
    setFormatToCopyByHand(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleCopyFormat = async () => {
    const format = buildPasteFormat(difficulties);
    try {
      await navigator.clipboard.writeText(format);
      setCopied(true);
      setFormatToCopyByHand(null);
    } catch {
      // No clipboard outside a secure context, or the browser refused: show it instead.
      setFormatToCopyByHand(format);
    }
  };

  const handleTextChange = (next: string) => {
    setText(next);
    setError(null);
    setDropped([]);
  };

  const handleAdd = () => {
    if (text.length > MAX_PASTE_CHARS) {
      setError("That's longer than one paste can take. Paste fewer questions at a time.");
      return;
    }
    const result = parseAiOutput(text, {
      categoryId: UnspecifiedIds.categoryId,
      languageId: UnspecifiedIds.languageId,
      quizDifficultyId: UnspecifiedIds.difficultyId,
      difficulties,
    });
    if (!result.ok) {
      setError(
        result.questions.length === 0 && result.dropped.length > 0
          ? "None of the pasted questions could be read:"
          : (result.error ?? "That reply couldn't be read."),
      );
      setDropped(result.dropped);
      return;
    }

    const kept = result.questions.slice(0, MAX_PASTED_QUESTIONS);
    addPastedQuestions(kept.map(({ question, settings }) => ({ question, settings })));

    const skipped = result.dropped.length + (result.questions.length - kept.length);
    addNotification({
      type: skipped > 0 ? "warning" : "success",
      title: `Added ${kept.length} question${kept.length === 1 ? "" : "s"}`,
      message:
        skipped > 0
          ? `${skipped} couldn't be added${result.questions.length > kept.length ? ` (at most ${MAX_PASTED_QUESTIONS} a paste)` : ""}. Check each pasted question before saving.`
          : "Check each pasted question before saving.",
    });
    handleOpenChange(false);
  };

  return (
    <>
      {showTrigger && (
        <LiftedButton
          type="button"
          outerClassName={outerClassName}
          className="flex items-center gap-2 bg-muted text-foreground"
          liftColor="muted-foreground"
          onClick={() => setOpen(true)}
        >
          <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
          Paste questions
        </LiftedButton>
      )}
      <PasteQuestionsView
        open={open}
        onOpenChange={handleOpenChange}
        text={text}
        onTextChange={handleTextChange}
        onCopyFormat={handleCopyFormat}
        formatToCopyByHand={formatToCopyByHand}
        copied={copied}
        onAdd={handleAdd}
        error={error}
        dropped={dropped}
      />
    </>
  );
};
