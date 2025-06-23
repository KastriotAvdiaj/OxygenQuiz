import { Card, CardContent } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
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
    <Card
      className={`bg-background border ${borderColor} dark:bg-muted/30 ${backgroundColor}`}
    >
      <CardContent className="p-6 space-y-8">
        <div className="px-0">
          <section className="flex flex-col items-center w-full">
            <Label className=" text-md">Question</Label>
          </section>
          <Input
            id="question-text"
            variant="quiz"
            className="!text-[1.5rem] py-8 w-full"
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
