import { useMultipleChoiceQuestionData } from "../api/Multiple_Choice_Question/get-multiple-choice-questions";
import { useTrueFalseQuestionData } from "../api/True_False-Question/get-true_false-questions";
import { useTypeTheAnswerQuestionData } from "../api/Type_The_Answer-Question/get-type-the-answer-questions";
import {
  useMyMultipleChoiceQuestionData,
  useMyTrueFalseQuestionData,
  useMyTypeTheAnswerQuestionData,
} from "@/pages/UserDashboard/api/get-my-questions";

import { MultipleChoiceQuestionList } from "./Multiple_Choice_Question/multiple-choice-question-list";
import { TrueFalseQuestionList } from "../Components/True_Flase-Question/true-false-question-list";
import { TypeTheAnswerQuestionList } from "../Components/Type_The_Answer-Question/type-the-asnwer-list";
import { PaginationControls } from "./Re-Usable-Components/pagination-control";
import { Spinner } from "@/components/ui";
import { QuestionListComponent } from "../../Quiz/components/Create-Quiz-Form/components/question-select/select-common-question-list";
import { QuestionType } from "@/types/question-types";

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
  isModalOpen: boolean;
  // "all"  → admin endpoints (every question)
  // "mine" → /questions/myQuestions (only the current user's). Defaults to "all"
  //          so existing admin usage is unchanged.
  scope?: "all" | "mine";
}

export const QuestionTabContent = ({
  questionType,
  queryParams,
  onPageChange,
  page = "admin", // Default to "admin" if not provided
  isModalOpen,
  scope = "all",
}: QuestionTabContentProps) => {
  const isMine = scope === "mine";

  // Only the hook matching the active scope + tab actually fetches; the rest stay
  // disabled. (Hooks must be called unconditionally, so we call both sets.)

  // ── "all" scope (admin) ──────────────────────────────────
  const mcqAll = useMultipleChoiceQuestionData({
    params: queryParams,
    queryConfig: {
      enabled:
        !isMine && isModalOpen && questionType === QuestionType.MultipleChoice,
    },
  });
  const trueFalseAll = useTrueFalseQuestionData({
    params: queryParams,
    queryConfig: {
      enabled:
        !isMine && isModalOpen && questionType === QuestionType.TrueFalse,
    },
  });
  const typeAnswerAll = useTypeTheAnswerQuestionData({
    params: queryParams,
    queryConfig: {
      enabled:
        !isMine && isModalOpen && questionType === QuestionType.TypeTheAnswer,
    },
  });

  // ── "mine" scope (user) ──────────────────────────────────
  const mcqMine = useMyMultipleChoiceQuestionData({
    params: queryParams,
    queryConfig: {
      enabled:
        isMine && isModalOpen && questionType === QuestionType.MultipleChoice,
    },
  });
  const trueFalseMine = useMyTrueFalseQuestionData({
    params: queryParams,
    queryConfig: {
      enabled: isMine && isModalOpen && questionType === QuestionType.TrueFalse,
    },
  });
  const typeAnswerMine = useMyTypeTheAnswerQuestionData({
    params: queryParams,
    queryConfig: {
      enabled:
        isMine && isModalOpen && questionType === QuestionType.TypeTheAnswer,
    },
  });

  // Pick the source for the current scope; the rest of the component is unchanged.
  const mcqQuery = isMine ? mcqMine : mcqAll;
  const trueFalseQuery = isMine ? trueFalseMine : trueFalseAll;
  const typeAnswerQuery = isMine ? typeAnswerMine : typeAnswerAll;

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
            {/* PAGE USER MEANS THAT IT IS USED IN THE QUESTION SELECT MODAL  */}
            {page == "user" ? (
              <QuestionListComponent questions={mcqQuery.data?.data || []} />
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
            {page == "user" ? (
              <QuestionListComponent
                questions={trueFalseQuery.data?.data || []}
              />
            ) : (
              <TrueFalseQuestionList
                questions={trueFalseQuery.data?.data || []}
              />
            )}

            <PaginationControls
              pagination={trueFalseQuery.data?.pagination}
              onPageChange={onPageChange}
            />
          </>
        );
      case QuestionType.TypeTheAnswer:
        return (
          <>
            {page == "user" ? (
              <QuestionListComponent
                questions={typeAnswerQuery.data?.data || []}
              />
            ) : (
              <TypeTheAnswerQuestionList
                questions={typeAnswerQuery.data?.data || []}
              />
            )}
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
