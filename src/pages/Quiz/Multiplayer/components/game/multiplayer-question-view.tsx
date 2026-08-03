import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Participant } from "../../hooks/use-lobby-connection";
import { FloatingAvatarCluster, type AvatarClusterPlayer } from "./floating-avatar-cluster";

interface MultiplayerQuestionViewProps {
  match: ReturnType<typeof useMatch>;
  username: string;
  participants: Participant[];
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
export function MultiplayerQuestionView({ match, username, participants }: MultiplayerQuestionViewProps) {
  const { question, deadlineUtc, clockSkewMs, hasSubmitted, answered } = match;
  const [timedOut, setTimedOut] = useState(false);

  // Stable identity so QuizTimer's countdown effect can't be restarted by a re-render of this
  // component. QuizTimer holds its callbacks in refs and no longer depends on them, so this is
  // belt-and-braces rather than load-bearing — but an inline arrow here is the exact shape of
  // the bug that froze the timer, and it shouldn't be re-typed out of habit.
  const handleTimeUp = useCallback(() => setTimedOut(true), []);

  const clusterPlayers: AvatarClusterPlayer[] = participants.map((p) => ({
    username: p.username,
    profileImageUrl: p.profileImageUrl,
    isCurrentUser: p.username === username,
    state: answered.includes(p.username) ? "submitted" : "idle",
  }));

  // Clear the local timed-out flag whenever a new question opens, so a previous question's
  // timeout doesn't carry over and disable the next one's inputs. (hasSubmitted is reset by
  // useMatch on QuestionStarted.)
  useEffect(() => {
    setTimedOut(false);
  }, [question?.questionId]);

  // Seconds left when this question opened — computed once per question so QuizTimer (which counts
  // down internally from `initialTime`) isn't reset on every render. Honors the server deadline so
  // a late joiner or a reconnecting player sees the correct remaining time rather than a fresh one.
  //
  // Two guards, both learned the hard way:
  //
  //  - **`clockSkewMs`.** The deadline is the *server's* wall clock. Subtracting a client
  //    `Date.now()` that disagrees with it by a few seconds is what made a 30s question open at
  //    32 or 34. `useMatch` measures the offset from the same event and we correct for it, so the
  //    number shown is a real duration rather than a difference between two unrelated clocks.
  //  - **`Math.min(limit, …)`.** A cheap ceiling so no arithmetic here — a skew estimate taken
  //    during a network hiccup, a malformed timestamp, a future change to how the deadline is
  //    built — can ever show more time than the question is actually worth. It costs nothing and
  //    it makes the failure mode "slightly short", which is the safe direction: the server's
  //    deadline check is the authority, so a display that over-promises is the one that produces
  //    an answer the player believes was in time and the server rejects.
  const initialSeconds = useMemo(() => {
    if (!question) return 0;
    const limit = question.timeLimitSeconds;
    if (!deadlineUtc) return limit;

    const deadlineMs = new Date(deadlineUtc).getTime();
    if (!Number.isFinite(deadlineMs)) return limit;

    const remaining = Math.ceil((deadlineMs - (Date.now() + clockSkewMs)) / 1000);
    return Math.min(limit, Math.max(0, remaining));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.questionId, deadlineUtc, clockSkewMs]);

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
    <div className="relative">
      {/* Multiplayer-only indicator: shows who's still in the match and who has locked in an
          answer, without touching the singleplayer-shared layout below. */}
      <div className="absolute -top-1 right-0 z-20 sm:top-0 sm:right-1">
        <FloatingAvatarCluster players={clusterPlayers} size="sm" showToasts maxVisible={4} />
      </div>

      <motion.div
        key={question.questionId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-4 pt-8 sm:space-y-6 sm:pt-10">
        {/* Header: progress + circular timer, matching the singleplayer question layout */}
        <div className="flex items-center justify-center">
          <QuizTimer
            initialTime={initialSeconds}
            totalTime={question.timeLimitSeconds}
            onTimeUp={handleTimeUp}
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
    </div>
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
    allowMultipleSelections: q.allowMultipleSelections ?? false,
  };
}
