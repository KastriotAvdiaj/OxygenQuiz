import { useState,useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { useQuestionCategoryData } from "./Categories/api/get-question-categories";
// import CreateQuestionCategoryForm from "./Categories/Components/create-question-category";
import { Spinner } from "@/components/ui";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
import { QuestionList } from "./Components/question-list";
import { Question } from "@/types/ApiTypes";
// import { Button } from "@/components/ui/button";
// import CreateQuestionForm from "./Components/create-question";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { FolderMinus, Search, Filter } from "lucide-react";

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
    <div className="my-8 p-8">
      {/* Filters and Search */}
      <div className="flex justify-between mb-6">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search questions..."
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {questionCategoriesQuery.data?.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question List */}
      <QuestionList
        questions={allQuestions}
        onScrollEnd={handleFetchNextPage} // Add infinite scroll
      />
    </div>
  );
};
