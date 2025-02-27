import { useState, useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { useQuestionCategoryData } from "./Entities/Categories/api/get-question-categories";
import { Card, Spinner } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
import { QuestionList } from "./Components/question-list";
import { useDebounce } from "@/hooks/use-debounce";
import { CategorySelect } from "./Entities/Categories/Components/select-question-category";

import { useQuestionDifficultyData } from "./Entities/Difficulty/api/get-question-difficulties";
import { LangaugesView } from "./Entities/Language/components/language-view";
import { DifficultyView } from "./Entities/Difficulty/Components/difficulty-view";
import { CategoryView } from "./Entities/Categories/Components/category-view";
import { useQuestionLanguageData } from "./Entities/Language/api/get-question-language";
import CreateQuestionForm from "./Components/Create-Question-Components/create-question";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const questionsQuery = useQuestionData({
    params: {
      page,
      pageSize: pageSize,
      searchTerm: debouncedSearchTerm,
      category: selectedCategory !== "all" ? selectedCategory : "all",
    },
  });

  const questionCategoriesQuery = useQuestionCategoryData({});

  const questionDifficultiesQuery = useQuestionDifficultyData({});

  const questionLanguagesQuery = useQuestionLanguageData({});

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory]);

  const handlePageChange = (Direction: "prev" | "next") => {
    if (Direction === "prev" && page > 1) {
      setPage((prevPage) => prevPage - 1);
    } else if (page < (questionsQuery.data?.totalPages || 1)) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  if (questionsQuery.isLoading || questionCategoriesQuery.isLoading) {
    return <Spinner size="lg" />;
  }

  if (questionsQuery.isError || questionCategoriesQuery.isError) {
    return <p>Failed to load questions. Try again later.</p>;
  }

  return (
    <>
      <Card className="p-8 bg-background border border-border">
        <div className="flex justify-between mb-6">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions..."
          />
          <div className="flex space-x-4 items-center">
            <CategorySelect
              categories={questionCategoriesQuery.data || []}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
            <CreateQuestionForm
              languages={questionLanguagesQuery.data || []}
              categories={questionCategoriesQuery.data || []}
              difficulties={questionDifficultiesQuery.data || []}
            />
          </div>
        </div>
        <Separator />
        <QuestionList
          questions={questionsQuery.data?.items || []}
          onNextPage={() => handlePageChange("next")}
          onPreviousPage={() => handlePageChange("prev")}
          currentPage={page}
          totalPages={questionsQuery.data?.totalPages || 1}
        />
      </Card>
      <CategoryView />
      <DifficultyView />
      <LangaugesView />
    </>
  );
};
