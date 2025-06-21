import { CardContent } from "@/components/ui";
import { useQuiz } from "../../../Quiz-questions-context";
import { NewTypeTheAnswerQuestion } from "../../../types";
import { SmallBaseQuestionCard } from "../existing-small-question-card-components/shared/small-base-question-card";
import { NewSmallQuestionCardProps } from "../existing-small-question-card-components/shared/types";
import { truncateText } from "../existing-small-question-card-components/small-true-false-card/small-true-false-question-card";
import { QuestionBubble } from "../existing-small-question-card-components/shared/question-text-bubble";

export const NewSmallTypeTheAnswerCard: React.FC<NewSmallQuestionCardProps> = ({ 
  question, 
  onRemove, 
  isActive = false 
}) => {
  const { displayQuestion } = useQuiz();
  const newTtaQuestion = question as NewTypeTheAnswerQuestion;
  const truncatedText = truncateText(newTtaQuestion.text, 50);
  const isSelected = displayQuestion?.id === newTtaQuestion.id;

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