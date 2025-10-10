import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiService } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { QuestionType } from "@/types/question-types";
import { PointSystem } from "../../Quiz/components/Create-Quiz-Form/types";

export const testQuestionInputSchema = z.object({
  questionId: z.number().int().positive("Question ID is required"),
  questionType: z.nativeEnum(QuestionType),
  timeLimitInSeconds: z.number().int().nonnegative(),
  pointSystem: z.nativeEnum(PointSystem),
  timeTaken: z.number().nonnegative(),
  timedOut: z.boolean(),
  // For Multiple Choice
  selectedOptionId: z.number().int().positive().optional(),
  selectedOptionIds: z.array(z.number().int().positive()).optional(),
  // For True/False and Type Answer
  answer: z.string().optional(),
});

export type TestQuestionInput = z.infer<typeof testQuestionInputSchema>;

export interface TestQuestionResponse {
  isCorrect: boolean;
  score: number;
  correctAnswer: string;
}

export const testQuestion = ({ data }: { data: TestQuestionInput }): Promise<TestQuestionResponse> => {
    console.log('Testing question with data:', data);
  return apiService.post('/questions/test', data);
};

type UseTestQuestionOptions = {
  mutationConfig?: MutationConfig<typeof testQuestion>;
};

export const useTestQuestion = ({ mutationConfig }: UseTestQuestionOptions = {}) => {
  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: testQuestion,
    onSuccess: (...args) => {
      onSuccess?.(...args);
    },
    onError: (error, variables, context) => {
      console.error('Error testing question:', error);
      onError?.(error, variables, context);
    },
    ...restConfig,
  });
};