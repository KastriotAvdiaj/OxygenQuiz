// src/components/quiz/QuizOverview.tsx

import { Trophy, Target, Clock} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { QuizSession } from "../../quiz-session-types";
import { calculateQuizStats, formatDuration } from "./quiz-session-utils";
import { Badge } from "@/components/ui/badge";

interface QuizOverviewProps {
  session: QuizSession;
}

export function QuizOverview({ session }: QuizOverviewProps) {
  const stats = calculateQuizStats(session);
  const timeTaken =
    session.endTime && session.startTime
      ? new Date(session.endTime).getTime() -
        new Date(session.startTime).getTime()
      : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card
        className="relative overflow-hidden bg-primary color-white"
        variant="lifted"
        >
        <div className="absolute top-4 right-4">
          <Badge
            variant="outline"
            className="bg-background/50 backdrop-blur-sm">
            {session.category}
          </Badge>
        </div>

        <CardContent className="pt-10 pb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/20">
            <Trophy className="h-12 w-12" />
          </div>

          <h2 className="text-2xl font-medium uppercase tracking-wider mb-1">
            Final Score
          </h2>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-9xl font-black tracking-tighter">
              {session.totalScore}
            </span>
            <span className="text-3xl font-medium">
              / {stats.maxPossibleScore}
            </span>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-lg font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/40 text-green-400 dark:text-green-400 border border-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {stats.correctAnswers} Correct
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/40 text-red-400 dark:text-red-400 border border-red-400">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {stats.incorrectAnswers} Incorrect
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none bg-muted/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-background text-primary shadow-sm">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-md text-muted-foreground font-medium uppercase">
                Accuracy
              </p>
              <p className="text-2xl font-bold">{stats.scorePercentage}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-muted/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-background text-primary shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-md text-muted-foreground font-medium uppercase">
                Time Taken
              </p>
              <p className="text-2xl font-bold">{formatDuration(timeTaken)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
