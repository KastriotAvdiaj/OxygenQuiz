import { QuestionType } from "@/types/question-types";
import { NewMultipleChoiceQuestion, NewTrueFalseQuestion, NewTypeTheAnswerQuestion } from "./types";

export const UnspecifiedIds = {
    categoryId:    1,   
    difficultyId:  1,  
    languageId:    1,  
  } as const;   

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

export const DEFAULT_NEW_MULTIPLE_CHOICE: NewMultipleChoiceQuestion = {
  id: -1,
  text: "",
  visibility: "Private",
  difficultyId: UnspecifiedIds.difficultyId,
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  imageUrl: "",
  type: QuestionType.MultipleChoice,
  answerOptions: [
    { id: -1, text: "", isCorrect: false },
    { id: -2, text: "", isCorrect: false },
    { id: -3, text: "", isCorrect: false },
    { id: -4, text: "", isCorrect: false },
  ],
  allowMultipleSelections: false,
};

export const DEFAULT_NEW_TRUE_FALSE: NewTrueFalseQuestion = {
  id: -2,
  text: "",
  visibility: "Private",
difficultyId: UnspecifiedIds.difficultyId,
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  imageUrl: "",
  type: QuestionType.TrueFalse,
  correctAnswer: true,
};

export const DEFAULT_NEW_TYPE_ANSWER: NewTypeTheAnswerQuestion = {
  id: -3,
  text: "",
  visibility: "Private",
  difficultyId: UnspecifiedIds.difficultyId,
  categoryId: UnspecifiedIds.categoryId,
  languageId: UnspecifiedIds.languageId,
  imageUrl: "",
  type: QuestionType.TypeTheAnswer,
  correctAnswer: "",
  isCaseSensitive: false,
  allowPartialMatch: false,
  acceptableAnswers: [],
};