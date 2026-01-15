import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CardTitle,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HelpCircle, Clock } from "lucide-react";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { ColorCard } from "@/common/ColouredCard";
import { cn } from "@/utils/cn";

interface QuizCardProps {
  quiz: QuizSummaryDTO;
  onClick?: (quiz: QuizSummaryDTO) => void;
}

export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes > 0 ? minutes + "m " : ""}${remainingSeconds}s`;
}

export function QuizCard({ quiz, onClick }: QuizCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Parse colors for the shadow and fallback borders
  const colors = useMemo(() => {
    try {
      return quiz.colorPaletteJson
        ? (JSON.parse(quiz.colorPaletteJson) as string[])
        : ["#6366f1", "#8b5cf6", "#06b6d4"];
    } catch {
      return ["#6366f1", "#8b5cf6", "#06b6d4"];
    }
  }, [quiz.colorPaletteJson]);

  const primaryColor = colors[0];

  // Create the gradient string for the border
  const gradientStyle = useMemo(() => {
    return `linear-gradient(to bottom right, ${colors.join(", ")})`;
  }, [colors]);

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(quiz);
    },
    [onClick, quiz]
  );

  return (
    <div
      className="relative group w-full max-w-sm mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {/* 1. THE LIFTED SHADOW (Neo-brutalism layer) */}
      <div
        className="absolute top-2 left-2 w-full h-full rounded-xl opacity-40 transition-transform duration-200"
        style={{ backgroundColor: primaryColor }}
      />

      {/* 2. THE GRADIENT BORDER WRAPPER 
          We use padding + background-clip to simulate a thick gradient border */}
      <div
        className={cn(
          "relative p-[4px] rounded-xl transition-all duration-200 ease-out",
          isHovered
            ? "-translate-y-1 -translate-x-1"
            : "translate-y-0 translate-x-0"
        )}
        style={{ background: gradientStyle }}
        onClick={() => onClick?.(quiz)}>
        {/* 3. THE ACTUAL CARD BODY (Internal) */}
        <div className="relative bg-card rounded-[calc(0.75rem-4px)] overflow-hidden">
          <ColorCard
            colorPalette={
              quiz.colorPaletteJson || '["#6366f1", "#8b5cf6", "#06b6d4"]'
            }
            gradient={quiz.gradient}
            size="lg"
            animated={true}
            borderAnimation={false} // Custom border handled by parent div
            className="border-none cursor-pointer">
            {/* Hover Overlay */}
            <motion.div
              className="absolute inset-0 backdrop-blur-sm z-10"
              style={{ backgroundColor: `${primaryColor}05` }}
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            {!isHovered && (
              <div className="relative z-20 flex flex-col justify-center items-center text-center h-48 p-3 sm:p-4 md:p-5">
                <Badge
                  variant="secondary"
                  className="text-xs font-medium px-2 py-1 rounded-full mb-2 sm:mb-3 border"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    borderColor: `${primaryColor}40`,
                  }}>
                  {quiz.category}
                </Badge>

                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold leading-tight text-center text-foreground drop-shadow-sm line-clamp-3">
                  {quiz.title}
                </CardTitle>
              </div>
            )}

            <AnimatePresence mode="wait">
              {isHovered && (
                <motion.div
                  className="absolute inset-0 z-30 flex flex-col"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}>
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium px-2 py-1 rounded-full border"
                        style={{
                          backgroundColor: `${primaryColor}20`,
                          borderColor: `${primaryColor}40`,
                        }}>
                        {quiz.category}
                      </Badge>
                    </div>

                    <CardTitle className="text-base sm:text-lg md:text-xl font-bold leading-tight line-clamp-2 text-foreground drop-shadow-sm">
                      {quiz.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pb-2 sm:pb-3 flex-1 px-3 sm:px-4">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 text-foreground/80">
                        <HelpCircle className="h-3 w-3" />
                        <span className="font-medium drop-shadow-sm">
                          {quiz.questionCount} questions
                        </span>
                      </div>

                      {quiz.timeLimitInSeconds && (
                        <div className="flex items-center gap-1.5 text-foreground/80">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium drop-shadow-sm">
                            {secondsToMinutes(quiz.timeLimitInSeconds)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 p-3 sm:p-4">
                    <Button
                      className="w-full group/button font-medium border text-foreground text-xs sm:text-sm"
                      style={{
                        backgroundColor: `${primaryColor}30`,
                        borderColor: `${primaryColor}90`,
                      }}
                      size="sm"
                      onClick={handleButtonClick}>
                      <span className="relative z-10">Start Quiz</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2 relative z-10 transition-transform duration-200 group-hover/button:translate-x-1" />
                    </Button>
                  </CardFooter>
                </motion.div>
              )}
            </AnimatePresence>
          </ColorCard>
        </div>
      </div>
    </div>
  );
}
