import { useState, useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { useQuestionCategoryData } from "./Categories/api/get-question-categories";
import CreateQuestionCategoryForm from "./Categories/Components/create-question-category";
import { Card, DataTable, Spinner } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
import { QuestionList } from "./Components/question-list";
import { useDebounce } from "@/hooks/use-debounce";
import { columns } from "./Categories/Components/columns";
import { CategorySelect } from "./Categories/Components/select-question-category";
import CreateQuestionForm from "./Components/create-question";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const questionsQuery = useQuestionData({
    params: {
      page,
      pageSize: pageSize,
      searchTerm: debouncedSearchTerm,
      category: selectedCategory !== "all" ? selectedCategory : null,
    },
  });

  const questionCategoriesQuery = useQuestionCategoryData({});

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
            <CreateQuestionForm
              categories={questionCategoriesQuery.data || []}
            />
          </div>
        </div>
        <Separator />

        {/* Question List */}
        <QuestionList
          questions={questionsQuery.data?.items || []}
          onNextPage={() => handlePageChange("next")}
          onPreviousPage={() => handlePageChange("prev")}
          currentPage={page}
          totalPages={questionsQuery.data?.totalPages || 1}
        />
      </Card>
      <Card className="m-10 p-8 bg-background-secondary">
        <CreateQuestionCategoryForm />
        <DataTable
          data={questionCategoriesQuery.data || []}
          columns={columns}
        />
      </Card>
    </>
  );
};
