import { Card, CardContent } from "@/components/ui";
import { Input } from "@/components/ui/form";

interface BaseQuestionFormCardProps {
  questionText: string;
  onQuestionTextChange: (text: string) => void;
  children: React.ReactNode;
  borderColor: string;
  backgroundColor?: string;
}

export const BaseQuestionFormCard: React.FC<BaseQuestionFormCardProps> = ({
  questionText,
  onQuestionTextChange,
  children,
  borderColor,
  backgroundColor,
}) => {
  return (
    <Card className={`bg-background border ${borderColor} ${backgroundColor}`}>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <Input
            id="question-text"
            variant="fullColor"
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
