import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MultipleChoiceQuestion, AnswerOption } from "@/types/ApiTypes"; // Adjust path

interface MultipleChoiceQuestionCardProps {
  question: MultipleChoiceQuestion;
  // Add any action props if needed, e.g., onEdit, onDelete
}

export const MultipleChoiceQuestionCard = ({ question }: MultipleChoiceQuestionCardProps) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{question.text}</CardTitle>
        <CardDescription>
          ID: {question.id} | Type: Multiple Choice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <h4 className="font-semibold mb-1 text-sm">Answer Options:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {question.answerOptions.map((option: AnswerOption) => (
              <li key={option.id} className="flex items-center">
                {option.text}
                {/* Optional: Display if correct for admin/review purposes */}
                {/* {option.isCorrect ? (
                  <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="ml-2 h-4 w-4 text-red-500" />
                )} */}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm">
          <span className="font-semibold">Allows Multiple Selections:</span>{" "}
          {question.allowMultipleSelections ? "Yes" : "No"}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex gap-2">
          <Badge variant="outline">Category: {question.category.category}</Badge>
          <Badge variant="secondary">Difficulty: {question.difficulty.level}</Badge>
          <Badge variant="outline">Language: {question.language.language}</Badge> {/* Assuming language has a name property */}
        </div>
        <span>
          Visibility: {question.visibility} | Created: {new Date(question.createdAt).toLocaleDateString()}
        </span>
      </CardFooter>
    </Card>
  );
};