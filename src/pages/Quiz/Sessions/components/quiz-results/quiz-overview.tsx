// src/components/quiz/QuizOverview.tsx

import { Trophy, Target, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { QuizSession } from "../../../../../types/quiz-session-types";
import {
  calculateQuizStats,
  formatDuration,
  getPerformanceLevel,
} from "./quiz-session-utils";
import { Badge } from "@/components/ui/badge";

interface QuizOverviewProps {
  session: QuizSession;
}

export function QuizOverview({ session }: QuizOverviewProps) {
  const stats = calculateQuizStats(session);
  const performance = getPerformanceLevel(stats.normalizedScore);
  const timeTaken =
    session.endTime && session.startTime
      ? new Date(session.endTime).getTime() -
        new Date(session.startTime).getTime()
      : 0;

  return (
    <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
      <Card
        className="relative overflow-hidden bg-primary color-white"
        variant="lifted"
      >
        <div className="absolute top-3 right-3">
          <Badge
            variant="outline"
            className="bg-background/50 backdrop-blur-sm text-xs"
          >
            {session.category}
          </Badge>
        </div>

        <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6 text-center text-white">
          <div className="inline-flex items-center justify-center p-2 mb-2 rounded-full bg-primary/20">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>

          <h2 className="text-base sm:text-lg font-medium uppercase tracking-wider mb-0.5">
            Final Score
          </h2>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter leading-none">
              {stats.normalizedScore}
            </span>
            <span className="text-xl sm:text-2xl font-medium">/ 100</span>
          </div>

          <p
            className="mt-1.5 text-sm sm:text-base font-semibold tracking-wide"
            style={{ color: performance.color }}
          >
            {/* {performance.level} */}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/40 text-green-400 dark:text-green-400 border border-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {stats.correctAnswers} Correct
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/40 text-red-400 dark:text-red-400 border border-red-400">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {stats.incorrectAnswers} Incorrect
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-none bg-muted/50">
          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-background text-primary shadow-sm shrink-0">
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase">
                Raw Score
              </p>
              <p className="text-base sm:text-lg font-bold">
                {stats.rawTotalScore} pts
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-muted/50">
          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-background text-primary shadow-sm shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase">
                Time Taken
              </p>
              <p className="text-base sm:text-lg font-bold">
                {formatDuration(timeTaken)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
