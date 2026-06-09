import { useState, useEffect, useReducer } from "react";
import { DataTable, Card, Spinner } from "@/components/ui";
import { Link } from "react-router-dom";
import { quizColumns } from "@/pages/Dashboard/Pages/Quiz/components/Data-Table-Columns/columns";
import { useMyQuizzesData } from "./api/get-my-quizzes";
import { useDebounce } from "@/hooks/use-debounce";

import { Separator } from "@/components/ui/separator";
import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { GrFormNextLink } from "react-icons/gr";
import { QuizFilters } from "@/pages/Dashboard/Pages/Quiz/components/Quiz-Filter";
import {
  filterReducer,
  initialFilterState,
} from "@/pages/Dashboard/Pages/Quiz/components/Quiz-Filter/filter-config";

export const MyQuizzes = () => {
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const [debouncedSearchTerm] = useDebounce(filterState.searchTerm, 500);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);

  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const queryParams = {
    pageNumber: pageNumber,
    pageSize: pageSize,
    searchTerm: debouncedSearchTerm || undefined,
    categoryId: filterState.selectedCategoryId,
    difficultyId: filterState.selectedDifficultyId,
    languageId: filterState.selectedLanguageId,
    visibility: filterState.selectedVisibility,
    isPublished: filterState.selectedIsPublished,
    isActive: filterState.selectedIsActive,
  };

  const quizData = useMyQuizzesData({
    params: queryParams,
  });

  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    filterState.selectedCategoryId,
    filterState.selectedDifficultyId,
    filterState.selectedLanguageId,
    filterState.selectedVisibility,
    filterState.selectedIsPublished,
    filterState.selectedIsActive,
  ]);

  const isFilterDataLoading =
    categoriesQuery.isLoading ||
    difficultiesQuery.isLoading ||
    languagesQuery.isLoading;

  if (isFilterDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (quizData.isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (quizData.isError) {
    return <p>Failed to load quizzes. Try again later.</p>;
  }

  const quizzes = quizData.data?.data ?? [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <Dialog>
          <DialogTrigger asChild>
            <LiftedButton>+ Create Quiz</LiftedButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <p className="text-xl">Choose your quiz title</p>
                <p className="text-muted-foreground text-xs">
                  (You can still change later)
                </p>
              </DialogTitle>
            </DialogHeader>
            <Input variant="quiz" placeholder="Quiz Title" />
            <section className="flex flex-col items-end mt-6">
              <Link to="/my-dashboard/quizzes/create" className="w-fit">
                <LiftedButton className="w-fit">
                  Next
                  <GrFormNextLink />
                </LiftedButton>
              </Link>
            </section>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6 bg-card border dark:border-foreground/30">
        <QuizFilters
          filterState={filterState}
          dispatch={dispatch}
          categories={categoriesQuery.data || []}
          difficulties={difficultiesQuery.data || []}
          languages={languagesQuery.data || []}
          totalResults={quizData.data?.pagination?.totalItems || 0}
        />

        <Separator className="my-6" />

        <DataTable data={quizzes} columns={quizColumns} />
      </Card>
    </div>
  );
};
