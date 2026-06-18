import { useState, useCallback } from "react";
import { useSearchQuizzes } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Clock, Check, ArchiveX } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "@/pages/Quiz/components/quiz-card";
import type { SelectedQuiz } from "../../hooks/use-lobby-connection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  QuizToolbar,
  ALL_FILTER,
  SORT_RULES,
  type SortOption,
} from "@/pages/Quiz/components/quiz-header";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import { motion, AnimatePresence } from "framer-motion";

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
  const [categoryId, setCategoryId] = useState(ALL_FILTER);
  const [difficultyId, setDifficultyId] = useState(ALL_FILTER);
  const [languageId, setLanguageId] = useState(ALL_FILTER);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data: categories = [] } = useQuestionCategoryData({});
  const { data: difficulties = [] } = useQuestionDifficultyData({});
  const { data: languages = [] } = useQuestionLanguageData({});

  const filters: FilterRule[] = [];
  if (categoryId !== ALL_FILTER) filters.push(rule.eq("categoryId", Number(categoryId)));
  if (difficultyId !== ALL_FILTER) filters.push(rule.eq("difficultyId", Number(difficultyId)));
  if (languageId !== ALL_FILTER) filters.push(rule.eq("languageId", Number(languageId)));

  const query: FilterQuery = {
    search: debouncedSearch || undefined,
    sort: [SORT_RULES[sortBy]],
    filters,
  };

  const { data: quizData, isLoading } = useSearchQuizzes({ scope: "public", query });

  const quizzes = quizData?.items ?? [];

  const hasActiveFilters =
    Boolean(searchQuery) ||
    categoryId !== ALL_FILTER ||
    difficultyId !== ALL_FILTER ||
    languageId !== ALL_FILTER;

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryId(ALL_FILTER);
    setDifficultyId(ALL_FILTER);
    setLanguageId(ALL_FILTER);
  }, []);

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

        <div className="p-4 sm:p-6 pb-2 space-y-4 flex flex-col flex-1 shrink-0">
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

          {/* Toolbar section */}
          <div className="pt-2">
            <QuizToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categories={categories}
              selectedCategoryId={categoryId}
              onCategoryChange={setCategoryId}
              difficulties={difficulties}
              selectedDifficultyId={difficultyId}
              onDifficultyChange={setDifficultyId}
              languages={languages}
              selectedLanguageId={languageId}
              onLanguageChange={setLanguageId}
              sortBy={sortBy}
              onSortChange={setSortBy}
              resultCount={quizData?.totalItems ?? quizzes.length}
            />
          </div>
        </div>

        {/* Scrollable quiz list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0 min-h-[300px] scrollbar-thin">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading quizzes...</span>
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
      </DialogContent>
    </Dialog>
  );
};
