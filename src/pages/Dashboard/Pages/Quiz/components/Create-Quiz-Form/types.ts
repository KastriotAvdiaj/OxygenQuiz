import { QuestionBase, QuestionCategory, QuestionDifficulty, QuestionLanguage, QuestionType } from "@/types/ApiTypes";
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

export interface NewQuestionBase {
  id?: number;
  text: string;
  imageUrl?:string;
  type: QuestionType;
  languageId: number;
  categoryId: number;
  difficultyId :number;
  visibility: string;
}

export interface NewMultipleChoiceQuestion extends NewQuestionBase {
  type: QuestionType.MultipleChoice;
  answerOptions: NewAnswerOption[];
  allowMultipleSelections: boolean;
}

export interface NewAnswerOption{
  id?:number;
  text:string;
  isCorrect: boolean;
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
    acceptableAnswers: string[] ;
  }

  export type NewAnyQuestion =
    | NewMultipleChoiceQuestion
    | NewTrueFalseQuestion
    | NewTypeTheAnswerQuestion;

export const POINT_SYSTEM_OPTIONS = [
  { value: "Standard", label: "Standard " },
  { value: "Double", label: "Double" },
  { value: "Quadruple", label: "Quadruple" },
  // { value: "Custom", label: "Custom" }, Should add in the future
] as const;

export const TIME_LIMIT_OPTIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 120, label: "2 minutes" },
] as const;