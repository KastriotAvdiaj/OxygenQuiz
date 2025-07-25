import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getTypeTheAnswerQuestionsQueryOptions } from "./get-type-the-answer-questions";
import { UnspecifiedIds } from "../../../Quiz/components/Create-Quiz-Form/constants";
import { TypeTheAnswerQuestion } from "@/types/question-types";

export const createTypeTheAnswerQuestionInputSchema = z.object({
  text:             z.string().min(1, "Question is required"),
  difficultyId:     z
                      .number().int().positive("Choose a difficulty")
                      .optional()
                      .default(UnspecifiedIds.difficultyId),
  categoryId:       z
                      .number().int().positive("Choose a category")
                      .optional()
                      .default(UnspecifiedIds.categoryId),
  languageId:       z
                      .number().int().positive("Choose a language")
                      .optional()
                      .default(UnspecifiedIds.languageId),
  visibility:       z.string().optional(),
  correctAnswer:    z.string().min(1, "Correct answer is required"),
  isCaseSensitive:  z.boolean().default(false),
  allowPartialMatch: z.boolean().default(false),
  imageUrl : z.string().optional(),
 acceptableAnswers: z.array(
  z.object({
    value: z.string().min(1, 'Additional acceptable answer cannot be empty'),
  })
).default([]),

});

const transformFormData = (data: CreateTypeTheAnswerQuestionInput) => {
  const transformedData = {
    ...data,
    acceptableAnswers: data.acceptableAnswers 
      ? data.acceptableAnswers.map(item => item.value)
      : []
  };
  
  return transformedData;
};

export type CreateTypeTheAnswerQuestionInput = z.infer<typeof createTypeTheAnswerQuestionInputSchema>;

export const createTypeTheAnswerQuestion = ({ data }: { data: CreateTypeTheAnswerQuestionInput }): Promise<TypeTheAnswerQuestion> => {
  return (
    console.log("data", data),
    apiService.post('/questions/typeTheAnswer', transformFormData(data)));
};

type UseCreateTypeTheAnswerQuestionOptions = {
  mutationConfig?: MutationConfig<typeof createTypeTheAnswerQuestion>;
};

export const useCreateTypeTheAnswerQuestion = ({ mutationConfig }: UseCreateTypeTheAnswerQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createTypeTheAnswerQuestion,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: getTypeTheAnswerQuestionsQueryOptions().queryKey });
      onSuccess?.(...args);
    },
    onError: (error, variables, context) => {
      console.error('Error creating type-the-answer question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};