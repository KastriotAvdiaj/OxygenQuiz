import { TypeTheAnswerQuestionCard } from "./type-the-asnwer-question-card";
import { useQuestionCategoryData } from "../../Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../../Entities/Language/api/get-question-language";
import CreateTypeAnswerQuestionForm from "./create-type-the-answer-question";
import { TypeTheAnswerQuestion } from "@/types/question-types";

interface TypeTheAnswerQuestionListProps {
  questions: TypeTheAnswerQuestion[];
}

export const TypeTheAnswerQuestionList = ({
  questions,
}: TypeTheAnswerQuestionListProps) => {
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  if (questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No "Type the Answer" questions found matching your criteria. <br />
        Add some questions to get started!
        <p className="mt-4">
          <CreateTypeAnswerQuestionForm
            languages={languagesQuery.data || []}
            categories={categoriesQuery.data || []}
            difficulties={difficultiesQuery.data || []}
            title="+ Add New"
          />
        </p>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <TypeTheAnswerQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};
