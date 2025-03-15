import { useParams } from "react-router";
import { Spinner } from "@/components/ui";
import { QuizQuestion, useQuizQuestionsData } from "../api/get-quiz-questions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export const QuizQuestions = () => {
  const { quizId } = useParams();
  const parsedQuizId = Number(quizId);

  const { data, isLoading, isError } = useQuizQuestionsData({
    quizId: parsedQuizId,
  });

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Failed to load quiz questions. Try again later.
      </div>
    );
  }

  const questions = data || [];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quiz Questions</h2>
      {questions.length > 0 ? (
        questions.map((quizQuestion, index) => (
          <QuestionCard
            key={quizQuestion.questionId || index}
            quizQuestion={quizQuestion}
            index={index}
          />
        ))
      ) : (
        <p>No questions found for this quiz.</p>
      )}
    </div>
  );
};

type QuestionCardProps = {
  quizQuestion: QuizQuestion;
  index: number;
};

const QuestionCard = ({ quizQuestion, index }: QuestionCardProps) => {
  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem
          key={quizQuestion.questionId}
          value={`question-${quizQuestion.questionId}`}
        >
          <AccordionTrigger>
            <div className="flex items-start text-left">
              <span className="mr-2">{index + 1}.</span>
              <div>
                <div>{quizQuestion.question.text}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">
                    {quizQuestion.question.difficulty.level}
                  </Badge>
                  <Badge variant="outline">
                    {quizQuestion.question.category.category}
                  </Badge>
                  <Badge variant="outline">{quizQuestion.score} Points</Badge>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-6 space-y-2">
              {quizQuestion.question.answerOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-3 rounded-md border ${
                    option.isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center">
                    {option.isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    )}
                    <span>{option.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
};
