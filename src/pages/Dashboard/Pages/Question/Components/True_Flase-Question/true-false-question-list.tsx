import { TrueFalseQuestionCard } from "./true-false-question-card";
import CreateTrueFalseQuestionForm from "./create-true_false-questions";
import { useQuestionCategoryData } from "../../Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../../Entities/Language/api/get-question-language";
import { TrueFalseQuestion } from "@/types/question-types";

interface TrueFalseQuestionListProps {
  questions: TrueFalseQuestion[];
}

export const TrueFalseQuestionList = ({
  questions,
}: TrueFalseQuestionListProps) => {
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  if (questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No true/false questions found matching your criteria.
        <br />
        Add some questions to get started!
        <p className="mt-4">
          <CreateTrueFalseQuestionForm
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
        <TrueFalseQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};
