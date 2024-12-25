import { useState, useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { useQuestionCategoryData } from "./Categories/api/get-question-categories";
// import CreateQuestionCategoryForm from "./Categories/Components/create-question-category";
import { Card, Spinner } from "@/components/ui";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
import { QuestionList } from "./Components/question-list";
import { Question } from "@/types/ApiTypes";
import { CategorySelect } from "./Categories/Components/select-question-category";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  const questionsQuery = useQuestionData({
    params: {
      page,
      pageSize,
      searchTerm,
      category: selectedCategory !== "all" ? selectedCategory : null,
    },
  });

  const questionCategoriesQuery = useQuestionCategoryData({});

  useEffect(() => {
    if (questionsQuery.data) {
      setAllQuestions((prev) => [...prev, ...questionsQuery.data.items]);
    }
  }, [questionsQuery.data]);

  const handleFetchNextPage = () => {
    if (page < (questionsQuery.data?.totalPages || 1)) {
      setPage(page + 1);
    }
  };

  if (questionsQuery.isLoading || questionCategoriesQuery.isLoading) {
    return <Spinner size="lg" />;
  }

  if (questionsQuery.isError || questionCategoriesQuery.isError) {
    return <p>Failed to load questions. Try again later.</p>;
  }

  return (
    <Card className="m-8 p-8">
      <div className="flex justify-between mb-6">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search questions..."
        />
        <CategorySelect
          categories={questionCategoriesQuery.data || []}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Question List */}
      <QuestionList
        questions={allQuestions}
        onScrollEnd={handleFetchNextPage} // Add infinite scroll
      />
    </Card>
  );
};
