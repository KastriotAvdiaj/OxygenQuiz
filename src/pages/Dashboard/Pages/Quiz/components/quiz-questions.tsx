import { useParams } from "react-router";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui";
import { useQuizQuestionsData } from "../api/get-quiz-questions";
import { QuizQuestionDTO } from "@/types/quiz-types";
import { QuestionType } from "@/types/question-types";
import { TypeTheAnswerQuestionCard } from "../../Question/Components/Type_The_Answer-Question/type-the-asnwer-question-card";
import { TrueFalseQuestionCard } from "../../Question/Components/True_Flase-Question/true-false-question-card";
import { MultipleChoiceQuestionCard } from "../../Question/Components/Multiple_Choice_Question/multiple-choice-question-card";

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
  console.log("Quiz Questions:", questions);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quiz Questions</h2>
      {questions.length > 0 ? (
        questions.map((quizQuestion, index) => (
          <QuizQuestionCard
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

type QuizQuestionCardProps = {
  quizQuestion: QuizQuestionDTO;
  index: number;
};

const QuizQuestionCard = ({ quizQuestion, index }: QuizQuestionCardProps) => {
  const question = quizQuestion.question;

  const renderQuestionByType = () => {
    switch (question.type) {
      case QuestionType.MultipleChoice:
        return <MultipleChoiceQuestionCard question={question} />;

      case QuestionType.TrueFalse:
        return <TrueFalseQuestionCard question={question} />;

      case QuestionType.TypeTheAnswer:
        return <TypeTheAnswerQuestionCard question={question} />;
    }
  };

  return (
    <div className="mb-4">
      <Card className="mb-2 border-l-4 border-l-blue-500 dark:border-l-blue-400 rounded-none">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Question {index + 1}
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

      {renderQuestionByType()}
    </div>
  );
};
