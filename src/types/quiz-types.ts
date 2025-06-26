// types/quiz.types.ts

import { PaginatedResponse } from "./common-types";


export type QuizSummaryDTO = {
  id: number;
  title: string;
  description?: string;
  language: string;
  difficulty: string;
  category: string;
  createdAt: string;
  isPublished: boolean;
  isActive: boolean;
  user: string;
  questionCount: number;
};

export type PaginatedQuizSummaryResponse = PaginatedResponse<QuizSummaryDTO>;