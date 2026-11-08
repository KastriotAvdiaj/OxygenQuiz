import { EmptyQuestionList } from "../empty-question-list";
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
      <EmptyQuestionList typeName="Type the Answer">
        <CreateTypeAnswerQuestionForm
          languages={languagesQuery.data || []}
          categories={categoriesQuery.data || []}
          difficulties={difficultiesQuery.data || []}
          emptyState
        />
      </EmptyQuestionList>
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
