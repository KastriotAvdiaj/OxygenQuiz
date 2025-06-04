import { QuestionBase, QuestionCategory, QuestionDifficulty, QuestionLanguage } from "@/types/ApiTypes";
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
