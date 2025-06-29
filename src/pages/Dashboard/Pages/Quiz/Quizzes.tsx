import { useState, useEffect } from "react";
import { DataTable, Card, Spinner } from "@/components/ui";
import { Link } from "react-router-dom";
import { quizColumns } from "./components/Data-Table-Columns/columns";
import { useAllQuizzesData } from "./api/get-all-quizzes";
import { useDebounce } from "@/hooks/use-debounce";

// Import the filter dependencies
import { Separator } from "@/components/ui/separator";
import { useQuestionCategoryData } from "../Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../Question/Entities/Language/api/get-question-language";
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
import { QuizFilters } from "./components/Quiz-Filter";

export const Quizzes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >();
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<
    number | undefined
  >();
  const [selectedLanguageId, setSelectedLanguageId] = useState<
    number | undefined
  >();
  const [selectedVisibility, setSelectedVisibility] = useState<
    string | undefined
  >();
  const [selectedIsPublished, setSelectedIsPublished] = useState<
    boolean | undefined
  >();
  const [selectedIsActive, setSelectedIsActive] = useState<
    boolean | undefined
  >();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);

  // Load filter data
  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const queryParams = {
    pageNumber: pageNumber,
    pageSize: pageSize,
    searchTerm: debouncedSearchTerm || undefined,
    categoryId: selectedCategoryId,
    difficultyId: selectedDifficultyId,
    languageId: selectedLanguageId,
    visibility: selectedVisibility,
    isPublished: selectedIsPublished,
    isActive: selectedIsActive,
  };

  const quizData = useAllQuizzesData({
    params: queryParams,
  });

  // Reset page when filters change
  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
    selectedVisibility,
    selectedIsPublished,
    selectedIsActive,
  ]);

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    window.scrollTo(0, 0);
  };

  // Check if filter data is still loading
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

  // Extract the quiz data from the paginated response
  const quizzes = quizData.data?.data ?? [];
  const pagination = quizData.data?.pagination;

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quiz Management</h1>
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
              <Link to="/dashboard/quizzes/create-quiz" className="w-fit">
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
        {/* Filters section */}
        <QuizFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          categories={categoriesQuery.data || []}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          difficulties={difficultiesQuery.data || []}
          selectedDifficultyId={selectedDifficultyId}
          onDifficultyChange={setSelectedDifficultyId}
          languages={languagesQuery.data || []}
          selectedLanguageId={selectedLanguageId}
          onLanguageChange={setSelectedLanguageId}
          selectedVisibility={selectedVisibility}
          onVisibilityChange={setSelectedVisibility}
          selectedIsPublished={selectedIsPublished}
          onIsPublishedChange={setSelectedIsPublished}
          selectedIsActive={selectedIsActive}
          onIsActiveChange={setSelectedIsActive}
          totalResults={quizzes.length}
        />

        <Separator className="my-6" />

        <DataTable data={quizzes} columns={quizColumns} />
      </Card>
    </div>
  );
};
