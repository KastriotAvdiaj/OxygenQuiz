import { MultipleChoiceQuestionList } from "./Multiple_Choice_Question/multiple-choice-question-list";
import { TrueFalseQuestionList } from "../Components/True_Flase-Question/true-false-question-list";
import { TypeTheAnswerQuestionList } from "../Components/Type_The_Answer-Question/type-the-asnwer-list";
import { PaginationControls } from "@/components/ui/pagination-control";
import { Spinner } from "@/components/ui";
import { QuestionListComponent } from "../../Quiz/components/Create-Quiz-Form/components/question-select/select-common-question-list";
import {
  QuestionType,
  type MultipleChoiceQuestion,
  type TrueFalseQuestion,
  type TypeTheAnswerQuestion,
} from "@/types/question-types";
import { useTypedQuestionSearch } from "../api/search-questions-typed";
import { rule, type FilterQuery, type FilterRule, type SortRule } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";

// The filter inputs this tab understands. The page owns them; this component just maps
// them to the framework's FilterQuery. createdFrom/createdTo/userId/sort are optional, so
// callers that don't need them (quiz creator, user dashboard) pass the same shape as before.
interface QueryParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  // Single-value (legacy callers: quiz creator, user dashboard) …
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
  // … or multi-value (admin filters). When an array is provided it wins.
  categoryIds?: number[];
  difficultyIds?: number[];
  languageIds?: number[];
  userId?: string;
  createdFrom?: string; // ISO date
  createdTo?: string; // ISO date
  sort?: SortRule[];
}

interface QuestionTabContentProps {
  questionType: QuestionType;
  queryParams: QueryParams;
  onPageChange: (newPage: number) => void;
  page?: string;
  isModalOpen: boolean;
  // "all"  → admin endpoints (every question)
  // "mine" → ownership forced server-side (only the current user's). Defaults to "all".
  scope?: "all" | "mine";
}

// Prefer the multi-value array; fall back to the single legacy value; else nothing.
const idsOf = (many?: number[], one?: number): number[] =>
  many && many.length > 0 ? many : one != null ? [one] : [];

// UI filter inputs → framework FilterQuery. One place, easy to read and extend.
// Multiple ids become an `in` rule (e.g. categoryId in 3,4); a date range becomes `between`.
const toFilterQuery = (p: QueryParams): FilterQuery => {
  const filters: FilterRule[] = [];

  const categoryIds = idsOf(p.categoryIds, p.categoryId);
  const difficultyIds = idsOf(p.difficultyIds, p.difficultyId);
  const languageIds = idsOf(p.languageIds, p.languageId);

  if (categoryIds.length) filters.push(rule.in("categoryId", categoryIds));
  if (difficultyIds.length) filters.push(rule.in("difficultyId", difficultyIds));
  if (languageIds.length) filters.push(rule.in("languageId", languageIds));
  if (p.userId) filters.push(rule.eq("userId", p.userId));

  if (p.createdFrom && p.createdTo) filters.push(rule.between("createdAt", p.createdFrom, p.createdTo));
  else if (p.createdFrom) filters.push(rule.gte("createdAt", p.createdFrom));
  else if (p.createdTo) filters.push(rule.lte("createdAt", p.createdTo));

  return {
    page: p.pageNumber,
    pageSize: p.pageSize,
    search: p.searchTerm || undefined,
    filters,
    sort: p.sort,
  };
};

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
