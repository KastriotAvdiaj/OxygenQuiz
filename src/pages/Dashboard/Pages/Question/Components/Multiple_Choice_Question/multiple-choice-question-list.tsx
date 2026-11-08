import { MultipleChoiceQuestion } from "@/types/question-types";
import { MultipleChoiceQuestionCard } from "./multiple-choice-question-card";
import CreateMultipleChoiceQuestionForm from "./Create-Multiple-Choice-Question-Components/create-multiple-choice-question";
import { EmptyQuestionList } from "../empty-question-list";
import { useQuestionCategoryData } from "../../Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../../Entities/Language/api/get-question-language";

interface MultipleChoiceQuestionListProps {
  questions: MultipleChoiceQuestion[];
}

export const MultipleChoiceQuestionList = ({ questions }: MultipleChoiceQuestionListProps) => {
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  if (questions.length === 0) {
    return (
      <EmptyQuestionList typeName="multiple choice">
        <CreateMultipleChoiceQuestionForm
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
        <MultipleChoiceQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};