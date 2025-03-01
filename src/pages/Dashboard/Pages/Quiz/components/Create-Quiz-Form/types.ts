import { Question, QuestionCategory, QuestionDifficulty, QuestionLanguage } from "@/types/ApiTypes";
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
  questions: Question[];
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  isLoading: boolean;
  error: Error | null;
}

// Add this to your existing types.ts file
// export type CreateQuizInput = {
//     title: string;
//     description: string;
//     timeLimit: number;
//     passingScore: number;
//     categoryId: number;
//     languageId: number;
//     publicQuestions: {
//       questionId: number;
//       score: number;
//     }[];
//     privateQuestions: {
//       text: string;
//       difficultyId: number;
//       categoryId: number;
//       languageId: number;
//       score: number;
//       answerOptions: {
//         text: string;
//         isCorrect: boolean;
//       }[];
//     }[];
//   };