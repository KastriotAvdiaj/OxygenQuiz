import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { QuizSummaryDTO } from "@/types/quiz-types";

/**
 * Atomic AI-quiz import. Unlike the manual flow (which creates each question with its own
 * request, then creates the quiz), this sends the quiz AND its questions in one payload so
 * the backend can create everything in a single transaction. If it fails, nothing is
 * persisted — no orphan questions. See docs/quiz/ai-quiz-architecture.md §7.
 */

export interface AiImportAnswerOption {
  text: string;
  isCorrect: boolean;
}

export interface AiImportQuestion {
  /** When set, links an existing question instead of creating one; content fields ignored. */
  existingQuestionId?: number;
  type?: "MultipleChoice" | "TrueFalse" | "TypeTheAnswer";
  text?: string;
  difficultyId: number;
  imageUrl?: string;
  // per-quiz settings
  pointSystem: string;
  timeLimitInSeconds: number;
  orderInQuiz: number;
  // MultipleChoice
  answerOptions?: AiImportAnswerOption[];
  allowMultipleSelections?: boolean;
  // TrueFalse
  correctAnswerBoolean?: boolean;
  // TypeTheAnswer
  correctAnswerText?: string;
  isCaseSensitive?: boolean;
  allowPartialMatch?: boolean;
  acceptableAnswers?: string[];
}

export interface AiQuizImportInput {
  title: string;
  description?: string | null;
  categoryId: number;
  languageId: number;
  difficultyId: number;
  status?: "Draft" | "Unlisted" | "Public";
  showFeedbackImmediately?: boolean;
  shuffleQuestions?: boolean;
  imageUrl?: string;
  questions: AiImportQuestion[];
}

export const createAiQuiz = ({
  data,
}: {
  data: AiQuizImportInput;
}): Promise<QuizSummaryDTO> => {
  return api.post("/quiz/ai-import", data);
};

type UseCreateAiQuizOptions = {
  mutationConfig?: MutationConfig<typeof createAiQuiz>;
};

export const useCreateAiQuiz = ({
  mutationConfig,
}: UseCreateAiQuizOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createAiQuiz,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["quiz"] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["myQuizzes"] });
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error importing AI quiz:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
