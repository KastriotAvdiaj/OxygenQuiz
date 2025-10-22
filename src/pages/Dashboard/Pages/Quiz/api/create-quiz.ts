import { z } from "zod";
import { api } from "@/lib/Api-client";
import { MutationConfig } from "@/lib/React-query";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getAllQuizzesQueryOptions } from "./get-all-quizzes";
import { QuizSummaryDTO } from "@/types/quiz-types";

export const answerOptionInputSchema = z.object({
  text: z.string().min(1, "Answer option text is required"),
  isCorrect: z.boolean(),
  id: z.number().optional(),
});

export const answerOptionsSchema = z
  .array(answerOptionInputSchema)
  .min(2, "At least one answer option is required")
  .max(4, "No more than 4 answer options are allowed")
  .refine((options) => options.some((option) => option.isCorrect), {
    path: ["answerOptions"],
    message: "At least one answer option must be marked as correct",
  });

export const createQuizInputSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less"),

  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .nullable(),

  categoryId: z.number().int().positive({ message: "Category is required" }),

  languageId: z.number().int().positive({ message: "Language is required" }),

  difficultyId: z
    .number()
    .int()
    .positive({ message: "Difficulty is required" }),

  imageUrl: z.string().optional(),
  // Quiz Settings
  timeLimitInSeconds: z
    .number()
    .int()
    .min(0, "Time limit cannot be negative")
    .max(2000, "Time limit cannot exceed 2000 seconds")
    .default(0),

  showFeedbackImmediately: z.boolean().default(false),

  visibility: z
    .string()
    .min(1, "Visibility is required")
    .refine((val) => ["Public", "Private"].includes(val), {
      message: "Visibility must be public or private",
    }),

  shuffleQuestions: z.boolean().default(false),

  isPublished: z.boolean().default(false),

  questions: z
    .array(
      z.object({
        questionId: z
          .number()
          .int()
          .refine((val) => val !== 0, {
            message: "Question ID cannot be zero",
          }),

        timeLimitInSeconds: z
          .number()
          .int()
          .min(0, "Time limit cannot be negative")
          .max(2000, "Time limit cannot exceed 2000 seconds")
          .default(10),

        pointSystem: z
          .string()
          .min(1, "Point system is required")
          .default("Standard"),

        orderInQuiz: z
          .number()
          .int()
          .min(0, "Order must be non-negative")
          .default(0),
      })
    )
    .min(1, "At least one question is required"),
});

export type CreateQuizInput = z.infer<typeof createQuizInputSchema>;

export const createQuiz = ({
  data,
}: {
  data: CreateQuizInput;
}): Promise<QuizSummaryDTO> => {
  return api.post("/quiz", data);
};

type UseCreateQuizOptions = {
  mutationConfig?: MutationConfig<typeof createQuiz>;
};

export const useCreateQuiz = ({
  mutationConfig,
}: UseCreateQuizOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError, ...restConfig } = mutationConfig || {};

  return useMutation({
    mutationFn: createQuiz,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: getAllQuizzesQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    onError: (error, variables, onMutateResult, context) => {
      console.error("Error creating question quiz:", error);
      onError?.(error, variables, onMutateResult, context);
    },
    ...restConfig,
  });
};
