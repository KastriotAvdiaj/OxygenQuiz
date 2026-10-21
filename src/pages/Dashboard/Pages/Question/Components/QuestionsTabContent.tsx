import { MultipleChoiceQuestionList } from "./Multiple_Choice_Question/multiple-choice-question-list";
import { TrueFalseQuestionList } from "../Components/True_Flase-Question/true-false-question-list";
import { TypeTheAnswerQuestionList } from "../Components/Type_The_Answer-Question/type-the-asnwer-list";
import { PaginationControls } from "@/components/ui/pagination-control";
import { QuestionListSkeleton } from "../../../Components/list-page-skeletons";
import { QuestionListComponent } from "../../Quiz/components/Create-Quiz-Form/components/question-select/select-common-question-list";
import {
  QuestionType,
  type MultipleChoiceQuestion,
  type TrueFalseQuestion,
  type TypeTheAnswerQuestion,
} from "@/types/question-types";
import { useTypedQuestionSearch } from "../api/search-questions-typed";
import { toFilterQuery, type QuestionQueryParams } from "../api/question-filter-query";
import { pagedResponseToPagination } from "@/lib/pagination-query";

interface QuestionTabContentProps {
  questionType: QuestionType;
  queryParams: QuestionQueryParams;
  onPageChange: (newPage: number) => void;
  page?: string;
  isModalOpen: boolean;
  // "all"  → admin endpoints (every question)
  // "mine" → ownership forced server-side (only the current user's). Defaults to "all".
  scope?: "all" | "mine";
}

export const QuestionTabContent = ({
  questionType,
  queryParams,
  onPageChange,
  page = "admin",
  isModalOpen,
  scope = "all",
}: QuestionTabContentProps) => {
  const query = toFilterQuery(queryParams);

  // One hook per type; only the active tab's query is enabled. (Hooks must be called
  // unconditionally, so all three are declared and gated via `enabled`.)
  const mcq = useTypedQuestionSearch<MultipleChoiceQuestion>({
    type: QuestionType.MultipleChoice,
    scope,
    query,
    enabled: isModalOpen && questionType === QuestionType.MultipleChoice,
  });
  const trueFalse = useTypedQuestionSearch<TrueFalseQuestion>({
    type: QuestionType.TrueFalse,
    scope,
    query,
    enabled: isModalOpen && questionType === QuestionType.TrueFalse,
  });
  const typeAnswer = useTypedQuestionSearch<TypeTheAnswerQuestion>({
    type: QuestionType.TypeTheAnswer,
    scope,
    query,
    enabled: isModalOpen && questionType === QuestionType.TypeTheAnswer,
  });

  const activeQuery =
    questionType === QuestionType.TrueFalse
      ? trueFalse
      : questionType === QuestionType.TypeTheAnswer
      ? typeAnswer
      : mcq;

  // The cards' own shape, one per row the page will show, instead of a centred loader.
  if (activeQuery.isLoading) {
    return <QuestionListSkeleton count={queryParams.pageSize} />;
  }

  if (activeQuery.isError) {
    return (
      <p className="text-center text-red-500 py-8">
        Failed to load questions. Please try again later.
      </p>
    );
  }

  const isPickerModal = page === "user"; // reused inside the quiz creator's question picker

  const renderQuestionList = () => {
    switch (questionType) {
      case QuestionType.MultipleChoice: {
        const items = mcq.data?.items ?? [];
        return (
          <>
            {isPickerModal ? (
              <QuestionListComponent questions={items} />
            ) : (
              <MultipleChoiceQuestionList questions={items} />
            )}
            <PaginationControls
              pagination={mcq.data ? pagedResponseToPagination(mcq.data) : undefined}
              onPageChange={onPageChange}
            />
          </>
        );
      }
      case QuestionType.TrueFalse: {
        const items = trueFalse.data?.items ?? [];
        return (
          <>
            {isPickerModal ? (
              <QuestionListComponent questions={items} />
            ) : (
              <TrueFalseQuestionList questions={items} />
            )}
            <PaginationControls
              pagination={trueFalse.data ? pagedResponseToPagination(trueFalse.data) : undefined}
              onPageChange={onPageChange}
            />
          </>
        );
      }
      case QuestionType.TypeTheAnswer: {
        const items = typeAnswer.data?.items ?? [];
        return (
          <>
            {isPickerModal ? (
              <QuestionListComponent questions={items} />
            ) : (
              <TypeTheAnswerQuestionList questions={items} />
            )}
            <PaginationControls
              pagination={typeAnswer.data ? pagedResponseToPagination(typeAnswer.data) : undefined}
              onPageChange={onPageChange}
            />
          </>
        );
      }
      default:
        return null;
    }
  };

  return <div>{renderQuestionList()}</div>;
};
