import { QuestionType } from "@/types/ApiTypes";
import { NewAnyQuestion } from "../../types";
import { MultipleChoiceFormCard } from "./multiple-choice-question-form";

interface NewQuizQuestionCardProps {
  question: NewAnyQuestion;
}

export const NewQuestionCard: React.FC<NewQuizQuestionCardProps> = (props) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <MultipleChoiceFormCard question={props.question} />;
  }
};
