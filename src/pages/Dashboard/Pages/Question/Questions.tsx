import { useState, useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { useQuestionCategoryData } from "./Categories/api/get-question-categories";
import CreateQuestionCategoryForm from "./Categories/Components/create-question-category";
import { Card, Spinner } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
import { QuestionList } from "./Components/question-list";
import { useDebounce } from "@/hooks/use-debounce";
import { Question } from "@/types/ApiTypes";
import { CategorySelect } from "./Categories/Components/select-question-category";
import CreateQuestionForm from "./Components/create-question";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  const questionsQuery = useQuestionData({
    params: {
      page,
      pageSize,
      searchTerm: debouncedSearchTerm,
      category: selectedCategory !== "all" ? selectedCategory : null,
    },
  });

  const questionCategoriesQuery = useQuestionCategoryData({});

  useEffect(() => {
    if (questionsQuery.data) {
      setAllQuestions((prevQuestions) => [
        ...prevQuestions,
        ...questionsQuery.data.items,
      ]);
    }
  }, [questionsQuery.data]);

  useEffect(() => {
    setPage(1);
    setAllQuestions([]);
  }, [searchTerm, selectedCategory]);

  const handleFetchNextPage = () => {
    if (page < (questionsQuery.data?.totalPages || 1)) {
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
    <Card className="m-10 p-8 bg-background-secondary">
      <div className="flex justify-between mb-6">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search questions..."
        />
        <div className="flex space-x-4 items-center">
          {/* <CreateQuestionCategoryForm /> */}
          <CategorySelect
            categories={questionCategoriesQuery.data || []}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
          <CreateQuestionForm categories={questionCategoriesQuery.data || []} />
        </div>
      </div>
      <Separator />

      {/* Question List */}
      <QuestionList
        questions={allQuestions}
        onScrollEnd={handleFetchNextPage} // Add infinite scroll
      />
    </Card>
  );
};
