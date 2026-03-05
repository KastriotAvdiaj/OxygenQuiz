import { useState, useMemo, useCallback } from "react";
import { usePublicQuizzesData } from "@/pages/Dashboard/Pages/Quiz/api/get-public-quizzes";
import { Badge } from "@/components/ui/badge";
import { Search, HelpCircle, Clock, Check } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { secondsToMinutes } from "@/pages/Quiz/components/quiz-card";
import type { SelectedQuiz } from "../../hooks/use-lobby-connection";

interface QuizSelectionPanelProps {
  onSelectQuiz: (quizId: string, quizTitle: string) => void;
  selectedQuiz: SelectedQuiz | null;
}

export const QuizSelectionPanel = ({
  onSelectQuiz,
  selectedQuiz,
}: QuizSelectionPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: quizzesResponse, isLoading } = usePublicQuizzesData({
    params: {
      searchTerm: searchQuery || undefined,
    },
  });

  const quizzes = useMemo(
    () => quizzesResponse?.data || [],
    [quizzesResponse?.data]
  );

  const handleQuizSelect = useCallback(
    (quiz: QuizSummaryDTO) => {
      onSelectQuiz(quiz.id.toString(), quiz.title);
    },
    [onSelectQuiz]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base font-bold font-quiz tracking-wider text-foreground">
          Select a Quiz
        </h3>
        <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
          Public only
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search quizzes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border-2 border-primary/20 bg-background text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
        />
      </div>

      {/* Quiz list */}
      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No quizzes found
          </div>
        ) : (
          quizzes.map((quiz) => {
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
              <button
                key={quiz.id}
                onClick={() => handleQuizSelect(quiz)}
                className={`w-full text-left p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-150 ${
                  isSelected
                    ? "border-primary bg-primary/5 -translate-y-px shadow-sm"
                    : "border-border/50 hover:border-border bg-background hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <span className="text-xs sm:text-sm font-bold font-quiz tracking-wider text-foreground truncate">
                        {quiz.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <HelpCircle className="h-3 w-3" />
                        {quiz.questionCount}q
                      </span>
                      {quiz.timeLimitInSeconds > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {secondsToMinutes(quiz.timeLimitInSeconds)}
                        </span>
                      )}
                      <span
                        className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${primaryColor}15`,
                          color: primaryColor,
                        }}
                      >
                        {quiz.category}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex-shrink-0 p-1 rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
