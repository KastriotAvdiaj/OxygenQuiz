import { memo, useState } from "react";
import { useParams } from "react-router";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui";
import { List, LayoutGrid } from "lucide-react";
import { useQuizQuestionsData } from "../api/get-quiz-questions";
import { QuizQuestionDTO } from "@/types/quiz-types";
import { QuestionType } from "@/types/question-types";
import TypeTheAnswerQuestionCard from "../../Question/Components/Type_The_Answer-Question/type-the-asnwer-question-card";
import TrueFalseQuestionCard from "../../Question/Components/True_Flase-Question/true-false-question-card";
import MultipleChoiceQuestionCard from "../../Question/Components/Multiple_Choice_Question/multiple-choice-question-card";

type ViewMode = "list" | "grid";

export const QuizQuestions = () => {
  const { quizId } = useParams();
  const parsedQuizId = Number(quizId);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quiz Questions</h2>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
          </Button>
        </div>
      </div>

      {questions.length > 0 ? (
        <div>
          {viewMode === "list" ? (
            // List View - Full width accordion
            <div className="space-y-4">
              {questions.map((quizQuestion, index) => (
                <QuizQuestionCard
                  key={quizQuestion.questionId || index}
                  quizQuestion={quizQuestion}
                  index={index}
                  viewMode="list"
                />
              ))}
            </div>
          ) : (
            // Grid View - Masonry layout
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {questions.map((quizQuestion, index) => (
                <div
                  key={quizQuestion.questionId || index}
                  className="break-inside-avoid mb-4"
                >
                  <QuizQuestionCard
                    quizQuestion={quizQuestion}
                    index={index}
                    viewMode="grid"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p>No questions found for this quiz.</p>
      )}
    </div>
  );
};

type QuizQuestionCardProps = {
  quizQuestion: QuizQuestionDTO;
  index: number;
  viewMode: ViewMode;
};

const QuizQuestionCard = memo(
  ({ quizQuestion, viewMode }: QuizQuestionCardProps) => {
    const question = quizQuestion.question;

    // This function remains the same, it's perfect.
    const renderQuestionByType = () => {
      switch (question.type) {
        case QuestionType.MultipleChoice:
          return (
            <MultipleChoiceQuestionCard
              question={question}
              viewMode={viewMode}
            />
          );
        case QuestionType.TrueFalse:
          return (
            <TrueFalseQuestionCard question={question} viewMode={viewMode} />
          );
        case QuestionType.TypeTheAnswer:
          return (
            <TypeTheAnswerQuestionCard
              question={question}
              viewMode={viewMode}
            />
          );
      }
    };

    if (viewMode === "list") {
      // List view remains unchanged
      return (
        <div className="w-full">
          <Card className="relative mb-2 rounded-tl-[20px] rounded-tr-[20px] dark:border dark:border-foreground/30 dark:bg-primary/10">
            <CardHeader className="py-3 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white font-bold">
                  <p className="text-md px-2 bg-primary rounded-full">
                    {quizQuestion.orderInQuiz}
                  </p>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {quizQuestion.timeLimitInSeconds}s
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {quizQuestion.pointSystem}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Order: {quizQuestion.orderInQuiz}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
          <div className="w-full">{renderQuestionByType()}</div>
        </div>
      );
    }

    // --- NEW: Grid view now has its own Card wrapper with a header ---
    return (
      <Card className="overflow-hidden dark:border dark:border-foreground/30 dark:bg-primary/10">
        <CardHeader className="py-2 px-3 bg-muted/50 dark:bg-muted/20">
          <div className="flex items-center justify-between">
            <Badge variant="default" className="text-xs text-white">
              #{quizQuestion.orderInQuiz}
            </Badge>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs">
                {quizQuestion.timeLimitInSeconds}s
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {quizQuestion.pointSystem}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {/* The actual question card is now placed inside the grid card */}
        {renderQuestionByType()}
      </Card>
    );
  }
);
