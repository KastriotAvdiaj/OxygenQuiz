import { CardContent } from "@/components/ui";
import { NewMultipleChoiceQuestion } from "../../../../types";
import { SmallBaseQuestionCard } from "../../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionCardProps } from "../../existing-small-question-card-components/shared/types";
import { truncateText } from "../../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { QuestionBubble } from "../../shared/question-text-bubble";
import { NewSmallQuestionHeader } from "../shared/new-small-question-header";
import { List } from "lucide-react";
import { useQuiz } from "../../../../Quiz-questions-context";
import { NewMultipleChoiceOptions } from "./new-small-multiple-choice-question-options";

export const NewSmallMultipleChoiceCard: React.FC<
  NewSmallQuestionCardProps
> = ({ question, onRemove }) => {
  const { displayQuestion } = useQuiz();

  const newMcQuestion = question as NewMultipleChoiceQuestion;
  const truncatedText = truncateText(newMcQuestion.text, 50);
  const isSelected = displayQuestion?.id === newMcQuestion.id;

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-primary/80"
      gradientColor="bg-gradient-to-r from-background to-primary/20"
      onRemove={onRemove}
    >
      <NewSmallQuestionHeader
        icon={<List size={12} />}
        questionType="Multiple Choice"
        badgeColor="bg-blue-100 text-blue-600"
        questionId={newMcQuestion.id}
        className={
          isSelected
            ? "bg-gradient-to-r from-background to-primary/30"
            : undefined
        }
      />
      <CardContent>
        <QuestionBubble text={truncatedText} />
        <NewMultipleChoiceOptions
          question={newMcQuestion}
          truncateText={truncateText}
        />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};
