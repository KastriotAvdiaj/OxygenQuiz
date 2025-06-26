import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { getTypeTheAnswerQuestionsQueryOptions } from "./get-type-the-answer-questions";
import { TypeTheAnswerQuestion } from "@/types/question-types";



export const updateTypeTheAnswerQuestionInputSchema = z.object({
  id: z.number().int().optional(), 
  text : z.string().min(1, "Question is required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  imageUrl: z.string().nullable().optional(), 
  difficultyId: z.number().int().positive({ message: "Difficulty is required" }),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  visibility: z.string().min(1, "Visibility is required"),

  acceptableAnswers: z.array(
  z.object({
    value: z.string().min(1, 'Additional acceptable answer cannot be empty'),
  })
).default([]),

  isCaseSensitive: z.boolean().default(false),
  allowPartialMatch: z.boolean().default(false),});

export type UpdateTypeTheAnswerQuestionInput = z.infer<typeof updateTypeTheAnswerQuestionInputSchema>;

export const updateTypeTheAnswerQuestion = ({ data, questionId }: { data: UpdateTypeTheAnswerQuestionInput, questionId: number}): Promise<TypeTheAnswerQuestion> => {
  return (
    console.log("data", data, questionId),
    api.put(`/questions/typeTheAnswer/${questionId}`, transformFormData(data))
  );
};
const transformFormData = (data: UpdateTypeTheAnswerQuestionInput) => {
  const transformedData = {
    ...data,
    acceptableAnswers: data.acceptableAnswers 
      ? data.acceptableAnswers.map(item => item.value)
      : []
  };
  
  return transformedData;
};

type UseUpdateTypeTheAnswerQuestionOptions = {
  mutationConfig?: MutationConfig<typeof updateTypeTheAnswerQuestion>;
};

export const useUpdateTypeTheAnswerQuestion = ({ mutationConfig }: UseUpdateTypeTheAnswerQuestionOptions = {}) => {
  const queryClient = useQueryClient();
  
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: updateTypeTheAnswerQuestion,
    onSuccess: (data, ...args) => {
      queryClient.refetchQueries({ queryKey: getTypeTheAnswerQuestionsQueryOptions().queryKey });
      onSuccess?.(data, ...args);
    },
    onError: (error, variables, context) => {
      console.error('Error updating question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};