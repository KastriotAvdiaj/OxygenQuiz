import { QuestionType } from "@/types/question-types";
import { NewAnyQuestion } from "../../types";
import { MultipleChoiceFormCard } from "./multiple-choice-question-form";
import { TrueFalseFormCard } from "./true-false-question-form";
import { TypeTheAnswerFormCard } from "./type-the-asnwer-question-form";

interface NewQuizQuestionCardProps {
  question: NewAnyQuestion;
}

export const NewQuestionCard: React.FC<NewQuizQuestionCardProps> = (props) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <MultipleChoiceFormCard question={props.question} />;
    case QuestionType.TrueFalse:
      return <TrueFalseFormCard question={props.question} />;
    case QuestionType.TypeTheAnswer:
      return <TypeTheAnswerFormCard question={props.question} />;
  }
};
