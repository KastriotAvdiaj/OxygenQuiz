import { AnyQuestion, QuestionBase, QuestionCategory, QuestionDifficulty, QuestionLanguage, QuestionType } from "@/types/ApiTypes";
import { Control, UseFormRegister, FormState, UseFormSetValue, UseFormWatch, UseFormClearErrors } from "react-hook-form";
import { CreateQuizInput } from "../../api/create-quiz";

export interface FormProps {
  register: UseFormRegister<CreateQuizInput>;
  control: Control<CreateQuizInput>;
  formState: FormState<CreateQuizInput>;
  setValue: UseFormSetValue<CreateQuizInput>;
  watch: UseFormWatch<CreateQuizInput>;
  clearErrors: UseFormClearErrors<CreateQuizInput>;
}

export interface QueryData {
  questions: QuestionBase[];
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  isLoading: boolean;
  error: Error | null;
}

export interface QuestionSettings {
  pointSystem: string;
  timeLimitInSeconds: number;
  orderInQuiz: number;
}

export interface QuestionSettingsMap {
  [questionId: number]: Partial<QuestionSettings>;
}

export const DEFAULT_QUESTION_SETTINGS: QuestionSettings = {
  pointSystem: "Standard",
  timeLimitInSeconds: 10,
  orderInQuiz: 0,
};
export interface NewAnswerOption{
  id?:number;
  text:string;
  isCorrect: boolean;
}

export interface NewQuestionBase {
  id: number;
  text: string;
  visibility: string;
  difficultyId: number;
  categoryId: number;
  languageId: number;
  imageUrl?: string;
  type: QuestionType;
}

export interface NewMultipleChoiceQuestion extends NewQuestionBase {
  type: QuestionType.MultipleChoice;
  answerOptions: NewAnswerOption[];
  allowMultipleSelections: boolean;
}

export interface NewTrueFalseQuestion extends NewQuestionBase {
  type: QuestionType.TrueFalse;
  correctAnswer: boolean;
}

export interface NewTypeTheAnswerQuestion extends NewQuestionBase {
  type: QuestionType.TypeTheAnswer;
  correctAnswer: string;
  isCaseSensitive: boolean;
  allowPartialMatch: boolean;
  acceptableAnswers: { value: string }[];
}

export type NewAnyQuestion =
  | NewMultipleChoiceQuestion
  | NewTrueFalseQuestion
  | NewTypeTheAnswerQuestion;

export type QuizQuestion = AnyQuestion | NewAnyQuestion;


