import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { QuestionType } from "@/types/question-types";
import type { CurrentQuestion } from "@/types/quiz-session-types";
import { QuizTimer } from "@/pages/Quiz/Sessions/components/quiz-taking-process/quiz-timer";
import { QuestionCard } from "@/pages/Quiz/Sessions/components/quiz-taking-process/question-card";
import { TrueOrFalseQuestion } from "@/pages/Quiz/Sessions/components/quiz-taking-process/question-display-type-files/true-or-false-question";
import { TypeTheAnswerQuestion } from "@/pages/Quiz/Sessions/components/quiz-taking-process/question-display-type-files/type-the-answer-question";
import { MultipleChoiceQuestion } from "@/pages/Quiz/Sessions/components/quiz-taking-process/question-display-type-files/multiple-choice-question";
import { QuestionMedia } from "@/common/QuestionMedia";
import type { useMatch, RoundQuestionView } from "../../hooks/use-match";

interface MultiplayerQuestionViewProps {
  match: ReturnType<typeof useMatch>;
}

/**
 * Live multiplayer question screen, rendered to look identical to singleplayer by reusing the
 * exact same leaf components (`QuizTimer`, `QuestionCard`, `QuestionMedia`, and the per-type
 * answer components). This adapter's whole job is to bridge the two different data/interaction
 * models — see docs/deployment/known-issues.md ("Multiplayer & singleplayer gameplay UIs diverged"):
 *
 *  - shape: the match wire type `RoundQuestionView` is mapped to the singleplayer `CurrentQuestion`.
 *  - answers: singleplayer components call `onSubmit(optionId, text)`; the match hub wants a single
 *    raw string. We translate per type (TrueFalse → "True"/"False", MC → the option id, TTA → text).
 *  - feedback: multiplayer has no per-question instant feedback (results come in the separate reveal
 *    phase), so `instantFeedback` is always false here; correctness is shown by `RevealPanel`.
 */
export function MultiplayerQuestionView({ match }: MultiplayerQuestionViewProps) {
  const { question, deadlineUtc, hasSubmitted, answered } = match;
  const [timedOut, setTimedOut] = useState(false);

  // Clear the local timed-out flag whenever a new question opens, so a previous question's
  // timeout doesn't carry over and disable the next one's inputs. (hasSubmitted is reset by
  // useMatch on QuestionStarted.)
  useEffect(() => {
    setTimedOut(false);
  }, [question?.questionId]);

  // Seconds left when this question opened — computed once per question so QuizTimer (which counts
  // down internally from `initialTime`) isn't reset on every render. Honors the server deadline so
  // a late joiner sees the correct remaining time.
  const initialSeconds = useMemo(() => {
    if (!question) return 0;
    if (!deadlineUtc) return question.timeLimitSeconds;
    return Math.max(0, Math.ceil((new Date(deadlineUtc).getTime() - Date.now()) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.questionId, deadlineUtc]);

  const currentQuestion = useMemo<CurrentQuestion | null>(
    () => (question ? toCurrentQuestion(question, initialSeconds) : null),
    [question, initialSeconds]
  );

  if (!question || !currentQuestion) return null;

  const qType = currentQuestion.questionType;

  // Bridge the singleplayer onSubmit signature to the match hub's single raw-string submit.
  const handleSubmit = (selectedOptionId: number | null, submittedAnswer?: string) => {
    let raw: string;
    if (qType === QuestionType.TrueFalse) {
      // The singleplayer T/F component uses option id 1 = True, 2 = False (see toCurrentQuestion).
      raw = selectedOptionId === 1 ? "True" : "False";
    } else if (qType === QuestionType.TypeTheAnswer) {
      raw = (submittedAnswer ?? "").trim();
    } else {
      raw = submittedAnswer ?? (selectedOptionId != null ? String(selectedOptionId) : "");
    }
    if (!raw) return;
    match.submit(raw).catch(() => {
      /* use-match resets hasSubmitted on failure so the player can retry */
    });
  };

  const commonProps = {
    question: currentQuestion,
    onSubmit: handleSubmit,
    isSubmitting: hasSubmitted,
    instantFeedback: false,
    answerResult: null,
    isTimedOut: timedOut,
    onSelectionChange: () => {},
  };

  const renderAnswerInput = () => {
    switch (qType) {
      case QuestionType.TrueFalse:
        return <TrueOrFalseQuestion {...commonProps} />;
      case QuestionType.TypeTheAnswer: {
        const { question: _q, ...typeProps } = commonProps;
        return <TypeTheAnswerQuestion {...typeProps} />;
      }
      default:
        return <MultipleChoiceQuestion {...commonProps} />;
    }
  };

  return (
    <motion.div
      key={question.questionId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4 sm:space-y-6">
      {/* Header: progress + circular timer, matching the singleplayer question layout */}
      <div className="flex items-center justify-center">
        <QuizTimer
          initialTime={initialSeconds}
          totalTime={question.timeLimitSeconds}
          onTimeUp={() => setTimedOut(true)}
          isPaused={hasSubmitted}
          size="md"
        />
      </div>

      <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Question {question.index + 1} / {question.total}
      </p>

      <QuestionCard text={question.text} />

      <QuestionMedia mediaUrl={currentQuestion.mediaUrl} mediaType={currentQuestion.mediaType} alt="Question image" />

      {hasSubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-center">
            Locked in — waiting for the others…
          </p>
        </motion.div>
      ) : (
        <div className="relative z-10">{renderAnswerInput()}</div>
      )}

      <p className="text-center text-xs text-muted-foreground">{answered.length} answered</p>
    </motion.div>
  );
}

// Maps the match wire shape to the singleplayer CurrentQuestion the leaf components expect.
function toCurrentQuestion(q: RoundQuestionView, secondsLeft: number): CurrentQuestion {
  const questionType = (q.type as QuestionType) ?? QuestionType.MultipleChoice;

  let options = q.options.map((o) => ({ id: o.id, text: o.text }));
  // The match payload omits options for True/False (they're implicit). Synthesize the canonical
  // pair the singleplayer T/F component looks up by id (1 = True, 2 = False).
  if (questionType === QuestionType.TrueFalse && options.length === 0) {
    options = [
      { id: 1, text: "True" },
      { id: 2, text: "False" },
    ];
  }

  return {
    quizQuestionId: q.questionId,
    questionText: q.text,
    mediaUrl: q.imageUrl,
    mediaType: q.imageUrl ? "Image" : "None",
    options,
    timeLimitInSeconds: q.timeLimitSeconds,
    timeRemainingInSeconds: secondsLeft,
    questionType,
  };
}
