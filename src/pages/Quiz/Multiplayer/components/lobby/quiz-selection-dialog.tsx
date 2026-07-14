import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchQuizzes } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import { type FilterQuery } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { Badge } from "@/components/ui/badge";
import { LoadingWave } from "@/components/ui";
import { PaginationControls } from "@/components/ui/pagination-control";
import { HelpCircle, Clock, Check, ArchiveX, ChevronDown, ListFilter } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "@/pages/Quiz/components/quiz-card";
import type { SelectedQuiz } from "../../hooks/use-lobby-connection";
import { cn } from "@/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  QuizToolbar,
  SORT_RULES,
  DEFAULT_SORT,
  type SortOption,
} from "@/pages/Quiz/components/quiz-header";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import {
  QuizFilterPanel,
  useQuizFilterState,
} from "@/pages/Quiz/components/quiz-filters";
import { motion, AnimatePresence } from "framer-motion";

// Matches the /choose-quiz page size, so an identical filter/sort/page state reuses its
// React-Query cache entry (key includes the full query object).
const PAGE_SIZE = 12;

interface QuizSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuiz: (quizId: string, quizTitle: string) => void;
  selectedQuiz: SelectedQuiz | null;
}

export const QuizSelectionDialog = ({
  isOpen,
  onClose,
  onSelectQuiz,
  selectedQuiz,
}: QuizSelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Same "variety" default as /choose-quiz — hosts see the full breadth of
  // categories on the first page (docs/quiz/quiz-discovery.md).
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [pageNumber, setPageNumber] = useState(1);
  // The facet panel is tucked behind a toggle — dialog space is tight.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Multi-select facets (category / difficulty / language) → `in` filter rules.
  const {
    selections,
    toggle,
    clear: clearFacets,
    filters,
    activeCount: facetCount,
    selectionKey,
  } = useQuizFilterState();

  const { data: categories = [] } = useQuestionCategoryData({});
  const { data: difficulties = [] } = useQuestionDifficultyData({});
  const { data: languages = [] } = useQuestionLanguageData({});

  const query: FilterQuery = {
    page: pageNumber,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sort: [SORT_RULES[sortBy]],
    filters,
  };

  const { data: quizData, isLoading } = useSearchQuizzes({ scope: "public", query });

  const quizzes = quizData?.items ?? [];
  const pagination = quizData ? pagedResponseToPagination(quizData) : undefined;

  // Reset to the first page whenever the filter/search/sort criteria change.
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, selectionKey, sortBy]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNumber(newPage);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const hasActiveFilters = Boolean(searchQuery) || facetCount > 0;

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    clearFacets();
  }, [clearFacets]);

  const handleQuizSelect = useCallback(
    (quiz: QuizSummaryDTO) => {
      onSelectQuiz(quiz.id.toString(), quiz.title);
      onClose();
    },
    [onSelectQuiz, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden border-[3px] border-foreground">
        {/* Header gradient */}
        <div className="h-2 w-full bg-gradient-to-r from-primary via-primary/30 to-primary/30" />

        <div className="p-4 sm:p-6 pb-2 space-y-4 flex flex-col shrink-0">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl sm:text-2xl font-bold font-quiz tracking-wider text-foreground">
                Select a Quiz
              </DialogTitle>
              <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 border border-primary/20 bg-primary/5 text-primary">
                Public Only
              </Badge>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose a quiz to host for this multiplayer lobby.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar + collapsible facet panel */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <QuizToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              resultCount={quizData?.totalItems ?? quizzes.length}
              activeFilterCount={(searchQuery ? 1 : 0) + facetCount}
              onClearFilters={clearFilters}
              filterAction={
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-9 md:h-8 lg:h-9 px-3 rounded-xl border-2 border-primary/60 dark:border-primary/70 bg-background text-sm md:text-xs lg:text-sm font-medium shadow-[0_2px_0_0_var(--primary-edge)] hover:border-primary/80 active:shadow-none active:translate-y-0.5 transition-all"
                  >
                    <ListFilter className="h-4 w-4 text-primary/70" />
                    Filters
                    {facetCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular-nums">
                        {facetCount}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                        filtersOpen && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
              }
            />
            <CollapsibleContent>
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <QuizFilterPanel
                  variant="compact"
                  categories={categories}
                  difficulties={difficulties}
                  languages={languages}
                  selections={selections}
                  onToggle={toggle}
                  onClearAll={clearFacets}
                  activeCount={facetCount}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Scrollable quiz list */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0 min-h-[300px] scrollbar-thin"
        >
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center">
              <LoadingWave size="md" />
            </div>
          ) : quizzes.length === 0 ? (
            <motion.div
              className="flex h-40 flex-col items-center justify-center gap-3 text-sm sm:text-base text-muted-foreground"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ArchiveX className="h-8 w-8 sm:h-10 sm:w-10 opacity-50" />
              <span>No quizzes found</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <AnimatePresence mode="popLayout">
                {quizzes.map((quiz) => {
                  const isSelected = selectedQuiz?.id === quiz.id.toString();
                  const primaryColor = (() => {
                    try {
                      return quiz.colorPaletteJson
                        ? (JSON.parse(quiz.colorPaletteJson) as string[])[0]
                        : "#6366f1";
                    } catch {
                      return "#6366f1";
                    }
                  })();

                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={quiz.id}
                      onClick={() => handleQuizSelect(quiz)}
                      className={`group relative text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                        isSelected
                          ? "border-primary shadow-sm"
                          : "border-border/60 hover:border-primary/50 bg-background hover:shadow-sm"
                      }`}
                    >
                      {/* Selection background / hover effect */}
                      <div
                        className={`absolute inset-0 transition-opacity duration-200 ${
                          isSelected ? "opacity-10" : "opacity-0 group-hover:opacity-5"
                        }`}
                        style={{ backgroundColor: primaryColor }}
                      />

                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Title block */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm sm:text-base font-bold font-quiz tracking-wider text-foreground line-clamp-1">
                              {quiz.title}
                            </span>
                          </div>

                          {/* Top badge */}
                          <div className="flex items-center gap-2">
                             <span
                              className="px-[6px] py-[2px] rounded text-[9px] font-bold uppercase tracking-wider border"
                              style={{
                                backgroundColor: `${primaryColor}10`,
                                color: primaryColor,
                                borderColor: `${primaryColor}30`,
                              }}
                            >
                              {quiz.category || "Uncategorized"}
                            </span>
                             <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
                              by {quiz.user}
                            </span>
                          </div>

                          {/* Stats block */}
                          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <HelpCircle className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                              <span className="font-medium text-foreground">{quiz.questionCount}</span> q
                            </span>
                            {quiz.timeLimitInSeconds > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                                <span className="font-medium text-foreground">{secondsToMinutes(quiz.timeLimitInSeconds)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="flex-shrink-0 mt-1 p-1.5 rounded-full bg-primary text-white shadow-sm">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div
                            className="flex-shrink-0 mt-1 p-1.5 rounded-full border-2 border-transparent transition-colors duration-200 group-hover:border-primary/20"
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-border/60 px-4 sm:px-6 py-2.5">
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
