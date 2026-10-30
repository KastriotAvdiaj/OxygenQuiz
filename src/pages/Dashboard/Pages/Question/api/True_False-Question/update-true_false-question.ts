import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { mediaAssetIdSchema } from "@/features/media/api/upload-media";
import { explanationSchema } from "@/common/question-explanation";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { TrueFalseQuestion } from "@/types/question-types";
import {
  myQuestionKeys,
  questionKeys,
  quizQuestionKeys,
} from "@/lib/query-keys";

export const updateTrueFalseQuestionInputSchema = z.object({
  id: z.number().int().optional(),
  text: z.string().min(1, "Question is required"),
  // The attached image or clip: an asset id from POST /api/media, never a URL — the API writes
  // the URL itself (docs/media/media-pipeline.md). Mirrors QuestionBaseCM.MediaAssetId.
  mediaAssetId: mediaAssetIdSchema,
  // Optional "why" shown after answering. The API caps and normalises it too
  // (QuestionExplanation.Normalize); this is the fast-feedback half.
  explanation: explanationSchema,
  difficultyId: z
    .number()
    .int()
    .positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  visibility: z.string().min(1, "Visibility is required"),

  correctAnswer: z.boolean().optional(),
});

export type UpdateTrueFalseQuestionInput = z.infer<
  typeof updateTrueFalseQuestionInputSchema
>;

export const updateTrueFalseQuestion = ({
  data,
  questionId,
  params,
}: {
  data: UpdateTrueFalseQuestionInput;
  questionId: number;
  /** `fromQuizBuilder` + `quizId`: the quiz builder's in-place edit, which the API only allows
   *  under QuestionEditRule (409 otherwise). The Questions page sends none. */
  params?: { fromQuizBuilder: true; quizId?: number };
}): Promise<TrueFalseQuestion> => {
  return api.put(`/questions/truefalse/${questionId}`, data, { params });
};

type UseUpdateTrueFalseQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateTrueFalseQuestion>;
};

export const useUpdateTrueFalseQuestion = ({
  mutationConfig,
}: UseUpdateTrueFalseQuestionOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateTrueFalseQuestion,
    onSuccess: (data, ...args) => {
      // Invalidate the broad roots; prefix matching covers every list variant
      // (admin search, typed search, user dashboard, quiz views).
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      queryClient.invalidateQueries({ queryKey: myQuestionKeys.all });
      queryClient.invalidateQueries({ queryKey: quizQuestionKeys.all });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error updating question:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
