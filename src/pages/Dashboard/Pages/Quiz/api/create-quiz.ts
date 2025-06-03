import { QuizSummaryDTO } from '@/types/ApiTypes'
import {z} from 'zod'
import { api } from '@/lib/Api-client'
import { MutationConfig } from '@/lib/React-query'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getAllQuizzesQueryOptions } from './get-all-quizzes'


export const answerOptionInputSchema = z.object({
    text: z.string().min(1, 'Answer option text is required'),
    isCorrect: z.boolean(),
    id : z.number().optional(),
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
    timeLimit: z.number().int().positive({ message: "Time limit is required" }),
    score: z.number().min(1, { message: 'Score must be at least 1.' }),
  });
  
  export const publicQuestionInputSchema = z.object({
    questionId: z.number(),
    score: z.number().min(1, { message: 'Score must be at least 1.' }),
  });
  
export const createQuizInputSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .nullable(),

  categoryId: z.number()
    .int()
    .positive({ message: "Category is required" }),
  
  languageId: z.number()
    .int()
    .positive({ message: "Language is required" }),
  
  difficultyId: z.number()
    .int()
    .positive({ message: "Difficulty is required" }),

  // Quiz Settings
  timeLimitInSeconds: z.number()
    .int()
    .min(0, 'Time limit cannot be negative')
    .max(2000, 'Time limit cannot exceed 2000 seconds')
    .default(0),

  showFeedbackImmediately: z.boolean().default(false),

  visibility: z.string()
    .min(1, 'Visibility is required')
    .refine((val) => ['public', 'private', 'unlisted'].includes(val), {
      message: 'Visibility must be public, private, or unlisted'
    }),

  shuffleQuestions: z.boolean().default(false),

  isPublished: z.boolean().default(false),

  questions: z.object({
    publicQuestions: z.array(publicQuestionInputSchema).default([]),
    privateQuestions: z.array(privateQuestionInputSchema).default([]),
  }).default({ publicQuestions: [], privateQuestions: [] }),

  totalScore: z.number().optional(),
})
.superRefine((data, ctx) => {
  const publicScore = data.questions.publicQuestions.reduce(
    (sum, question) => sum + question.score,
    0
  );
  const privateScore = data.questions.privateQuestions.reduce(
    (sum, question) => sum + question.score,
    0
  );
  const totalScore = publicScore + privateScore;
  
  if (data.questions.publicQuestions.length > 0 || data.questions.privateQuestions.length > 0) {
    if (totalScore !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total score of questions must add up to 100, but got ${totalScore}.`,
        path: ["totalScore"],
      });
    }
  }
  if (data.isPublished && data.questions.publicQuestions.length === 0 && data.questions.privateQuestions.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Published quiz must have at least one question.",
      path: ["questions"],
    });
  }
});

export type CreateQuizInput = z.infer<typeof createQuizInputSchema>

export const createQuiz = ({data} : {data:CreateQuizInput}): Promise<QuizSummaryDTO> => {
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
                queryClient.invalidateQueries({ queryKey: getAllQuizzesQueryOptions().queryKey });
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