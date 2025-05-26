import { useMultipleChoiceQuestionData } from "../api/Normal-Question/get-multiple-choice-questions";
import { useTrueFalseQuestionData } from "../api/True_False-Question/get-true_false-questions";
import { useTypeTheAnswerQuestionData } from "../api/Type_The_Answer-Question/get-type-the-answer-questions";
import { QuestionType } from "@/types/ApiTypes";

import { MultipleChoiceQuestionList } from "./Multiple_Choice_Question/multiple-choice-question-list";
import { TrueFalseQuestionList } from "../Components/True_Flase-Question/true-false-question-list";
import { TypeTheAnswerQuestionList } from "../Components/Type_The_Answer-Question/type-the-asnwer-list";
import { PaginationControls } from "./Re-Usable-Components/pagination-control";
import { Spinner } from "@/components/ui";
import { SimpleMultipleChoiceQuestionList } from "@/pages/Question/User-question-components/user-question-type-lists";

interface QueryParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
}

interface QuestionTabContentProps {
  questionType: QuestionType;
  queryParams: QueryParams;
  onPageChange: (newPage: number) => void;
  page?: string;
}

export const QuestionTabContent = ({
  questionType,
  queryParams,
  onPageChange,
  page = "admin", // Default to "admin" if not provided
}: QuestionTabContentProps) => {
  // Keep all queries active but only fetch when needed
  const mcqQuery = useMultipleChoiceQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: questionType === QuestionType.MultipleChoice,
    },
  });

  const trueFalseQuery = useTrueFalseQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: questionType === QuestionType.TrueFalse,
    },
  });

  const typeAnswerQuery = useTypeTheAnswerQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: questionType === QuestionType.TypeTheAnswer,
    },
  });

  // Get the relevant query based on question type
  const getActiveQuery = () => {
    switch (questionType) {
      case QuestionType.MultipleChoice:
        return mcqQuery;
      case QuestionType.TrueFalse:
        return trueFalseQuery;
      case QuestionType.TypeTheAnswer:
        return typeAnswerQuery;
      default:
        return mcqQuery;
    }
  };

  const activeQuery = getActiveQuery();

  if (activeQuery.isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (activeQuery.isError) {
    return (
      <p className="text-center text-red-500 py-8">
        Failed to load questions. Please try again later.
      </p>
    );
  }

  // Render the appropriate question list based on the type
  const renderQuestionList = () => {
    switch (questionType) {
      case QuestionType.MultipleChoice:
        return (
          <>
            {page == "user" ? (
              <SimpleMultipleChoiceQuestionList
                questions={mcqQuery.data?.data || []}
              />
            ) : (
              <MultipleChoiceQuestionList
                questions={mcqQuery.data?.data || []}
              />
            )}
            <PaginationControls
              pagination={mcqQuery.data?.pagination}
              onPageChange={onPageChange}
            />
          </>
        );
      case QuestionType.TrueFalse:
        return (
          <>
            <TrueFalseQuestionList
              questions={trueFalseQuery.data?.data || []}
            />
            <PaginationControls
              pagination={trueFalseQuery.data?.pagination}
              onPageChange={onPageChange}
            />
          </>
        );
      case QuestionType.TypeTheAnswer:
        return (
          <>
            <TypeTheAnswerQuestionList
              questions={typeAnswerQuery.data?.data || []}
            />
            <PaginationControls
              pagination={typeAnswerQuery.data?.pagination}
              onPageChange={onPageChange}
            />
          </>
        );
      default:
        return null;
    }
  };

  return <div>{renderQuestionList()}</div>;
};
