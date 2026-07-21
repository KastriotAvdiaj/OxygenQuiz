import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { QuestionType } from "@/types/question-types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionCategoryData } from "../../../../../Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "../../../../../Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "../../../../../Question/Entities/Language/api/get-question-language";
import { QuestionTabContent } from "../../../../../Question/Components/QuestionsTabContent";
import { cn } from "@/utils/cn";
import { useQuiz } from "../../Quiz-questions-context";
import { useDisclosure } from "@/hooks/use-disclosure";

interface SelectQuestionComponentProps {
  triggerButton?: React.ReactElement;
  maxSelections?: number;
  preSelectedQuestionIds?: number[];
  title?: string;
  excludeQuestionIds?: number[];
  /**
   * Controlled open state. When provided, the parent owns the dialog's visibility (and,
   * unless a `triggerButton` is passed, the component renders no trigger of its own). This
   * lets the dialog be opened from elsewhere — e.g. an item in a menu that closes itself.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SelectQuestionComponent: React.FC<SelectQuestionComponentProps> = ({
  maxSelections,
  title = "Select Questions from Pool",
  triggerButton,
  open: openProp,
  onOpenChange,
}) => {
  const disclosure = useDisclosure();
  const isControlled = openProp !== undefined;
  const isOpen = isControlled ? openProp : disclosure.isOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else if (next) disclosure.open();
    else disclosure.close();
  };
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedDifficultyIds, setSelectedDifficultyIds] = useState<number[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState(QuestionType.MultipleChoice);

  const {
    tempSelectedQuestionsCount,
    commitTempSelection,
    clearTempSelection,
    setQuestionModalOpen,
  } = useQuiz();

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const categories = categoriesQuery.data || [];
  const difficulties = difficultiesQuery.data || [];
  const languages = languagesQuery.data || [];

  const queryParams = {
    pageNumber: currentPage,
    pageSize: questionsPerPage,
    searchTerm: debouncedSearchTerm || undefined,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    difficultyIds: selectedDifficultyIds.length > 0 ? selectedDifficultyIds : undefined,
    languageIds: selectedLanguageIds.length > 0 ? selectedLanguageIds : undefined,
    questionType: activeTab,
    visibility: "Public",
  };

  const hasFilters =
    searchTerm.length > 0 ||
    selectedCategoryIds.length > 0 ||
    selectedDifficultyIds.length > 0 ||
    selectedLanguageIds.length > 0;

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategoryIds([]);
    setSelectedDifficultyIds([]);
    setSelectedLanguageIds([]);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategoryIds, selectedDifficultyIds, selectedLanguageIds, activeTab]);

  const handleOpen = () => { setOpen(true); setQuestionModalOpen(true); };
  const handleClose = () => { setOpen(false); setQuestionModalOpen(false); };
  const handleAddSelectedQuestions = () => { commitTempSelection(); handleClose(); };
  const handleCancel = () => { clearTempSelection(); handleClose(); };

  return (
    <>
      {triggerButton ? (
        // Preserve any onClick the caller put on the trigger (e.g. closing a parent menu),
        // then open the pool dialog.
        React.cloneElement(triggerButton as React.ReactElement<any>, {
          onClick: (e: React.MouseEvent) => {
            triggerButton.props?.onClick?.(e);
            handleOpen();
          },
        })
      ) : isControlled ? null : (
        <LiftedButton onClick={handleOpen} liftColor="muted" className="h-fit bg-muted text-foreground border border-foreground/20" type="button">
          <Plus className="h-4 w-4" />
          Browse Public Pool
        </LiftedButton>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

          <div className="relative bg-background rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col border dark:border-foreground/20">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-foreground/10 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                {maxSelections && (
                  <p className="text-xs text-muted-foreground mt-0.5">Maximum {maxSelections} questions</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {tempSelectedQuestionsCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {tempSelectedQuestionsCount} selected{maxSelections && ` / ${maxSelections}`}
                  </span>
                )}
                <button
                  onClick={handleCancel}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── Inline filter toolbar ── */}
            <div className="px-6 py-3 border-b dark:border-foreground/10 bg-muted/30 shrink-0 flex flex-col gap-2">
              {/* Search */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions..."
                    className="h-8 w-full rounded-md border border-foreground/20 bg-background pl-8 pr-8 text-xs placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-foreground/30"
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
                {hasFilters && (
                  <button type="button" onClick={clearAllFilters}
                    className="shrink-0 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-100 dark:border-red-900/30 transition-colors">
                    Clear all
                  </button>
                )}
              </div>

              {/* 3-column filter dropdowns */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Category</label>
                  <select
                    value={selectedCategoryIds[0] ?? ""}
                    onChange={(e) => setSelectedCategoryIds(e.target.value ? [Number(e.target.value)] : [])}
                    className="h-7 w-full rounded-md border border-foreground/20 bg-background px-2 text-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-foreground/30 dark:bg-background">
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Difficulty</label>
                  <select
                    value={selectedDifficultyIds[0] ?? ""}
                    onChange={(e) => setSelectedDifficultyIds(e.target.value ? [Number(e.target.value)] : [])}
                    className="h-7 w-full rounded-md border border-foreground/20 bg-background px-2 text-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-foreground/30 dark:bg-background">
                    <option value="">All difficulties</option>
                    {difficulties.map((d) => <option key={d.id} value={d.id}>{d.level}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Language</label>
                  <select
                    value={selectedLanguageIds[0] ?? ""}
                    onChange={(e) => setSelectedLanguageIds(e.target.value ? [Number(e.target.value)] : [])}
                    className="h-7 w-full rounded-md border border-foreground/20 bg-background px-2 text-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-foreground/30 dark:bg-background">
                    <option value="">All languages</option>
                    {languages.map((l) => <option key={l.id} value={l.id}>{l.language}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as QuestionType)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value={QuestionType.MultipleChoice}>Multiple Choice</TabsTrigger>
                  <TabsTrigger value={QuestionType.TrueFalse}>True/False</TabsTrigger>
                  <TabsTrigger value={QuestionType.TypeTheAnswer}>Type Answer</TabsTrigger>
                </TabsList>

                <TabsContent value={QuestionType.MultipleChoice}>
                  <QuestionTabContent questionType={QuestionType.MultipleChoice} queryParams={queryParams} onPageChange={(p) => setCurrentPage(p)} page="user" isModalOpen={isOpen} />
                </TabsContent>
                <TabsContent value={QuestionType.TrueFalse}>
                  <QuestionTabContent questionType={QuestionType.TrueFalse} queryParams={queryParams} onPageChange={(p) => setCurrentPage(p)} page="user" isModalOpen={isOpen} />
                </TabsContent>
                <TabsContent value={QuestionType.TypeTheAnswer}>
                  <QuestionTabContent questionType={QuestionType.TypeTheAnswer} queryParams={queryParams} onPageChange={(p) => setCurrentPage(p)} page="user" isModalOpen={isOpen} />
                </TabsContent>
              </Tabs>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t dark:border-foreground/10 bg-muted/20 shrink-0">
              <span className="text-sm text-muted-foreground">
                {tempSelectedQuestionsCount > 0 ? (
                  <span className="font-medium text-foreground">
                    {tempSelectedQuestionsCount} question{tempSelectedQuestionsCount !== 1 ? "s" : ""} selected
                  </span>
                ) : "No questions selected yet"}
                {maxSelections && ` (max: ${maxSelections})`}
              </span>
              <div className="flex gap-3">
                <Button onClick={handleCancel} variant="outline">Cancel</Button>
                <Button
                  onClick={handleAddSelectedQuestions}
                  type="button"
                  disabled={tempSelectedQuestionsCount === 0}
                  className={cn(
                    "transition-all duration-200",
                    tempSelectedQuestionsCount > 0
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  Add {tempSelectedQuestionsCount > 0 ? `${tempSelectedQuestionsCount} ` : ""}Question{tempSelectedQuestionsCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectQuestionComponent;
