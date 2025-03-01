import { Quiz } from '@/types/ApiTypes'
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getQuizzesQueryOptions } from './get-quizzes'


export const answerOptionInputSchema = z.object({
    text: z.string().min(1, 'Answer option text is required'),
    isCorrect: z.boolean(),
  });
  
  export const answerOptionsSchema = z
  .array(answerOptionInputSchema)
  .min(2, "At least one answer option is required")
  .max(4, "No more than 4 answer options are allowed")
  .refine(
    (options) => options.some((option) => option.isCorrect),
    {
      path: ["answerOptions"],
      message: "At least one answer option must be marked as correct",
    }
  );

  export const privateQuestionInputSchema = z.object({
    text: z.string().min(1, 'Text is required'),
    difficultyId: z.number().int().positive({ message: "Language is required" }),
    languageId: z.number().int().positive({ message: "Language is required" }),
    categoryId: z.number().int().positive({ message: "Language is required" }),
    answerOptions: answerOptionsSchema,
    score: z.number().min(1, { message: 'Score must be at least 1.' }),
  });
  
  export const publicQuestionInputSchema = z.object({
    questionId: z.number(),
    score: z.number().min(1, { message: 'Score must be at least 1.' }),
  });
  
  export const createQuizInputSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    timeLimit: z.number().min(1, { message: 'Time limit must be at least 1.' }),
    passingScore: z.number().min(1, { message: 'Passing score must be at least 1.' }),
    categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
    publicQuestions: z.array(publicQuestionInputSchema),
    privateQuestions: z.array(privateQuestionInputSchema),
  });


export type CreateQuizInput = z.infer<typeof createQuizInputSchema>

export const createQuiz = ({data} : {data:CreateQuizInput}): Promise<Quiz> => {
    return api.post('/quizzes', data);
}

type UseCreateQuizOptions = {
    mutationConfig?: MutationConfig<typeof createQuiz>;
}

export const useCreateQuiz = ({ mutationConfig }: UseCreateQuizOptions = {}) => {
    const queryClient = useQueryClient();

    const { onSuccess, onError, ...restConfig } = mutationConfig || {};

    return useMutation(
        {
            mutationFn: createQuiz,
            onSuccess: (...args) => {
                queryClient.invalidateQueries({ queryKey: getQuizzesQueryOptions().queryKey });
                onSuccess?.(...args);
            },
            onError: (error, variables, context) => {
                console.error('Error creating question quiz:', error);
                onError?.(error, variables, context);
            },
            ...restConfig,
        }
    )
}