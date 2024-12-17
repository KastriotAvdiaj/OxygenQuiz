import { useState } from "react";
import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { useQuestionCategoryData } from "./Categories/api/get-question-categories";
import CreateQuestionCategoryForm from "./Categories/Components/create-question-category";
import { Spinner } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import CreateQuestionForm from "./Components/create-question";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderMinus, Search, Filter } from "lucide-react";

export const Questions = () => {
  const questionsQuery = useQuestionData({});
  const questionCategoriesQuery = useQuestionCategoryData({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  if (questionsQuery.isLoading || questionCategoriesQuery.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const questions = questionsQuery.data || [];
  const questionCategories = questionCategoriesQuery.data || [];

  const filteredQuestions = questions.filter(
    (question) =>
      (selectedCategory === "all" || question.category === selectedCategory) &&
      question.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 my-8 p-8 mx-auto">
      <Card className="bg-background-secondary shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle className="text-3xl font-bold">
              Questions Manager
            </CardTitle>
            <div className="flex items-center gap-3">
              <CreateQuestionForm categories={questionCategories} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
            <div className="relative w-full md:w-1/3">
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
            </div>
            <div className="flex items-center space-x-4 w-full md:w-auto">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-background-secondary">
                  <SelectItem value="all">All Categories</SelectItem>
                  {questionCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 overflow-y-auto py-7">
            {filteredQuestions.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-center p-12 rounded-lg">
                <FolderMinus size={48} className="mb-4" />
                <p className="text-xl font-semibold">No questions found.</p>
                <p className="text-sm mt-2">
                  Try adjusting your search or filter to find what you're
                  looking for.
                </p>
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <AdminQuestionCard key={question.id} question={question} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between items-center text-sm">
        <p>
          Showing {filteredQuestions.length} of {questions.length} questions
        </p>
        <p>{questionCategories.length} categories available</p>
      </div>

      <Card className="bg-background-secondary shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-6">
          <CardTitle className="text-3xl font-bold">
            Question Categories Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <CreateQuestionCategoryForm />
        </CardContent>
      </Card>
    </div>
  );
};
