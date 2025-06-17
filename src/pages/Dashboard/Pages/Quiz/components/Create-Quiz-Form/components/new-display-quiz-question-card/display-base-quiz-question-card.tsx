import { Card, CardContent } from "@/components/ui";
import { Input } from "@/components/ui/form";
import { QuestionType } from "@/types/ApiTypes";

interface BaseQuestionFormCardProps {
  questionText: string;
  onQuestionTextChange: (text: string) => void;
  children: React.ReactNode;
  borderColor: string;
  backgroundColor?: string;
  questionType?: QuestionType;
}

export const BaseQuestionFormCard: React.FC<BaseQuestionFormCardProps> = ({
  questionText,
  onQuestionTextChange,
  children,
  borderColor,
  backgroundColor,
  questionType,
}) => {
  return (
    <Card className={`bg-background border ${borderColor} ${backgroundColor}`}>
      <CardContent className="p-6">
        <div className="px-0">
          <Input
            id="question-text"
            variant="quiz"
            className="my-8 !text-[1.5rem] py-8 w-full"
            questionType={questionType}
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => onQuestionTextChange(e.target.value)}
          />
        </div>
        {children}
      </CardContent>
    </Card>
  );
};
