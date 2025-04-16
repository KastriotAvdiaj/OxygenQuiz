import { useState, useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/Normal-Question/get-questions";
import { useQuestionCategoryData } from "./Entities/Categories/api/get-question-categories";
import { Button, Card, Spinner } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/form";
// import { QuestionList } from "./Components/question-list";
import { useDebounce } from "@/hooks/use-debounce";
import { CategorySelect } from "./Entities/Categories/Components/select-question-category";

import { useQuestionDifficultyData } from "./Entities/Difficulty/api/get-question-difficulties";
import { LangaugesView } from "./Entities/Language/components/language-view";
import { DifficultyView } from "./Entities/Difficulty/Components/difficulty-view";
import { CategoryView } from "./Entities/Categories/Components/category-view";
import { useQuestionLanguageData } from "./Entities/Language/api/get-question-language";
import CreateQuestionForm from "./Components/Normal-Question/Create-Question-Components/create-question";
import { Popover } from "@/components/ui/popover";
import { PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { PlusCircle } from "lucide-react";
import { useDisclosure } from "@/hooks/use-disclosure";
import { LiftedButton } from "@/common/LiftedButton";

export const Questions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const { isOpen, open, close } = useDisclosure();

  const handleOpenChange = () => {
    if (!isOpen) {
      open();
    } else {
      close();
    }
  };

  // const questionsQuery = useQuestionData({
  //   params: {
  //     page,
  //     pageSize: pageSize,
  //     searchTerm: debouncedSearchTerm,
  //     category: selectedCategory !== "all" ? selectedCategory : "all",
  //   },
  // });

  const questionCategoriesQuery = useQuestionCategoryData({});

  const questionDifficultiesQuery = useQuestionDifficultyData({});

  const questionLanguagesQuery = useQuestionLanguageData({});

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory]);

  // const handlePageChange = (Direction: "prev" | "next") => {
  //   if (Direction === "prev" && page > 1) {
  //     setPage((prevPage) => prevPage - 1);
  //   } else if (page < (questionsQuery.data?.totalPages || 1)) {
  //     setPage((prevPage) => prevPage + 1);
  //   }
  // };

  // if (questionsQuery.isLoading || questionCategoriesQuery.isLoading) {
  //   return <Spinner size="lg" />;
  // }

  // if (questionsQuery.isError || questionCategoriesQuery.isError) {
  //   return <p>Failed to load questions. Try again later.</p>;
  // }

  return (
    <>
      <div className="flex flex-col gap-8">
        <Card className="p-8 bg-background border border-border">
          <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild onClick={open}>
              <LiftedButton>Add Question +</LiftedButton>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              className="w-auto p-4 z-20 dark:border border-foreground/60 bg-background rounded-sm flex flex-col align-center justify-center gap-2 shadow-md"
            >
              <CreateQuestionForm
                languages={questionLanguagesQuery.data || []}
                categories={questionCategoriesQuery.data || []}
                difficulties={questionDifficultiesQuery.data || []}
              />
              <LiftedButton onClick={close}>True/False</LiftedButton>
              <LiftedButton onClick={close}>Type the Answer</LiftedButton>
            </PopoverContent>
          </Popover>

          {/* <div className="flex justify-between mb-6">
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
           
          </div>
        </div> */}
          <Separator />
          {/* <QuestionList
          questions={questionsQuery.data?.items || []}
          onNextPage={() => handlePageChange("next")}
          onPreviousPage={() => handlePageChange("prev")}
          currentPage={page}
          totalPages={questionsQuery.data?.totalPages || 1}
        /> */}
        </Card>
        {/* <CategoryView />
      <DifficultyView />
      <LangaugesView /> */}
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-10 bg-black/50" onClick={close} />
      )}
    </>
  );
};
