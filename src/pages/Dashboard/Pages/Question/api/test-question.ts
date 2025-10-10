
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QuestionType } from "@/types/question-types";
import { PointSystem } from "../../Quiz/components/Create-Quiz-Form/types";

export interface TestQuestionRequest {
  questionId: number;
  questionType: QuestionType;
  timeLimitInSeconds: number;
  pointSystem: PointSystem;
  timeTaken: number;
  timedOut: boolean;
  // For Multiple Choice
  selectedOptionId?: number;
  selectedOptionIds?: number[]; //for multiple selections
  // For True/False and Type Answer
  answer?: string;
}

export interface TestQuestionResponse {
  isCorrect: boolean;
  score: number;
  correctAnswer: string;
}

export const testQuestion = async (
  data: TestQuestionRequest
): Promise<TestQuestionResponse> => {
  const response = await api.post("/questions/test", data);
  return response.data;
};

export const useTestQuestionMutation = () => {
  return useMutation({
    mutationFn: testQuestion,
  });
};