import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, HelpCircle } from "lucide-react";
import { Quiz } from "@/types/ApiTypes";
import formatDate from "@/lib/date-format";

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  return (
    <Card className="w-full max-w-md hover:shadow-lg bg-background transition-shadow duration-300 border-none">
      <CardHeader className="">
        <CardTitle className="text-2xl font-bold">{quiz.title}</CardTitle>
        {quiz.description && (
          <CardDescription className="text-sm text-muted-foreground">
            {quiz.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>
              {quiz.timeLimit ? `${quiz.timeLimit} minutes` : "No time limit"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <span>{quiz.numberOfQuestions} questions</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <span>Passing score: {quiz.passingScore}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Badge variant={quiz.isPublished ? "default" : "secondary"}>
          {quiz.isPublished ? "Published" : "Draft"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Created at: {formatDate(quiz.createdAt)}
        </span>
      </CardFooter>
    </Card>
  );
}
