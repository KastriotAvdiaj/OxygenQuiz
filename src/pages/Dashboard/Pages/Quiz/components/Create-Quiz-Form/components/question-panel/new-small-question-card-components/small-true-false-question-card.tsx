import { CardContent } from "@/components/ui";
import { NewTrueFalseQuestion } from "../../../types";
import { SmallBaseQuestionCard } from "../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionCardProps } from "../existing-small-question-card-components/shared/types";
import { truncateText } from "../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { QuestionBubble } from "../existing-small-question-card-components/shared/question-text-bubble";

export const NewSmallTrueFalseCard: React.FC<NewSmallQuestionCardProps> = ({ 
  question, 
  onRemove, 
}) => {
  const newTfQuestion = question as NewTrueFalseQuestion;
  const truncatedText = truncateText(newTfQuestion.text, 50);

  return (
    <SmallBaseQuestionCard
      question={question}
      borderColor="border-primary/80"
      gradientColor="bg-gradient-to-r from-background to-primary/20"
      onRemove={onRemove}
    >
      <CardContent>
        <QuestionBubble text={truncatedText} />
      </CardContent>
    </SmallBaseQuestionCard>
  );
};