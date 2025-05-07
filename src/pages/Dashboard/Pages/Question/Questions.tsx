import { useState, useEffect } from "react";
// import { AdminQuestionCard } from "./Components/admin-question-card";
import { useMultipleChoiceQuestionData } from "./api/Normal-Question/get-multiple-choice-questions";
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
import CreateTrueFalseQuestionForm from "./Components/True_Flase-Question/create-true_false-questions";
import {
  Dialog,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateTypeAnswerQuestionForm from "./Components/Type_The_Answer-Question/create-type-the-answer-question";

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

  // const questionsQuery = useMultipleChoiceQuestionData({
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
          <Dialog
            open={isOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                close();
              } else {
                open();
              }
            }}
          >
            <DialogTrigger>
              <LiftedButton className="flex items-center gap-2">
                Add Question +
              </LiftedButton>
            </DialogTrigger>
            <DialogContent className="bg-background p-4 rounded-md w-fit pt-8 dark:border border-foreground/30">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-center">
                  Choose the type of question
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <CreateQuestionForm
                  languages={questionLanguagesQuery.data || []}
                  categories={questionCategoriesQuery.data || []}
                  difficulties={questionDifficultiesQuery.data || []}
                />
                <CreateTrueFalseQuestionForm
                  languages={questionLanguagesQuery.data || []}
                  categories={questionCategoriesQuery.data || []}
                  difficulties={questionDifficultiesQuery.data || []}
                />
                <CreateTypeAnswerQuestionForm
                  languages={questionLanguagesQuery.data || []}
                  categories={questionCategoriesQuery.data || []}
                  difficulties={questionDifficultiesQuery.data || []}
                />
              </div>
            </DialogContent>
          </Dialog>

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
        <CategoryView />
      <DifficultyView />
      <LangaugesView />
      </div>
    </>
  );
};
