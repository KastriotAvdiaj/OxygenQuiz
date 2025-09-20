// src/components/quiz/QuizOverview.tsx

import {
  Trophy,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizSession } from "../../quiz-session-types";
import {
  calculateQuizStats,
  formatDuration,
} from "./quiz-session-utils";
import { Progress } from "@/components/ui/progress";

interface QuizOverviewProps {
  session: QuizSession;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

export function QuizOverview({ session }: QuizOverviewProps) {
  const stats = calculateQuizStats(session);
  const timeTaken =
    session.endTime && session.startTime
      ? new Date(session.endTime).getTime() -
        new Date(session.startTime).getTime()
      : 0;

  return (
    <div className="space-y-6">
      {/* Performance Header */}
      {/* <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <PerformanceIcon 
              className="h-12 w-12 mx-auto" 
              style={{ color: performance.color }} 
            />
            <div>
              <h2 
                className="text-2xl font-bold mb-1" 
                style={{ color: performance.color }}
              >
                {performance.level}
              </h2>
              <p className="text-muted-foreground">
                You scored {stats.scorePercentage}% on this quiz
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Total Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {session.totalScore}
            </div>
            <p className="text-sm text-muted-foreground">
              out of {stats.maxPossibleScore} points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.scorePercentage}%
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.correctAnswers} of {stats.totalQuestions} correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatDuration(timeTaken)}
            </div>
            <p className="text-sm text-muted-foreground">Total duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress and Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{stats.scorePercentage}%</span>
            </div>
            <Progress
              value={stats.scorePercentage}
              className="h-2 bg-muted dark:bg-foreground/10"
            />
          </div>

          {/* Answer Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">{stats.correctAnswers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-medium">{stats.incorrectAnswers}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="font-medium">{stats.timeoutAnswers}</div>
                <div className="text-sm text-muted-foreground">Timed Out</div>
              </div>
            </div>
          </div>

          {/* Category Performance if available */}
          {session.category && (
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-1">Category</div>
              <div className="font-medium">{session.category}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
