import { Card, CardContent } from "@/components/ui";
import { Input } from "@/components/ui/form";

interface BaseQuestionFormCardProps {
  questionText: string;
  onQuestionTextChange: (text: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const BaseQuestionFormCard: React.FC<BaseQuestionFormCardProps> = ({
  questionText,
  onQuestionTextChange,
  children,
  className = "",
}) => {
  return (
    <Card className={`bg-background border-2 border-primary/30 ${className}`}>
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
