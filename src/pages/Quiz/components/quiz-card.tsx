import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HelpCircle, Clock } from "lucide-react";
import { QuizSummaryDTO } from "@/types/quiz-types";
import { getCategoryImageData } from "./image-to-category-map";

interface QuizCardProps {
  quiz: QuizSummaryDTO;
}

export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes > 0 ? minutes + "m " : ""}${remainingSeconds}s`;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const categoryData = getCategoryImageData(quiz.category);
  console.log("Category Data:", categoryData);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Determine which image to use - quiz image or fallback
  const imageToUse = quiz.imageUrl || categoryData.image;

  return (
    <motion.div
      className="h-full cursor-pointer"
      whileHover={{
        scale: 1.02,
        y: -4,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.2,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      layout={false}
    >
      <Card
        className="relative h-full flex flex-col overflow-hidden rounded-xl border-2 
        border-foreground hover:border-primary transition-colors duration-200 group
        dark:border-border/60 dark:hover:border-primary/40 min-h-[250px]"
      >
        {/* <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${categoryData.gradient} 
            transition-opacity duration-300`}
          />

          <motion.img
            src={imageToUse}
            className="w-full h-full object-cover"
            style={{
              opacity: quiz.imageUrl ? 0.8 : 0.6, // Slightly different opacity for fallback
            }}
            animate={{
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            loading="eager"
            onError={(e) => {
              // If the image fails to load, hide it and rely on gradient
              e.currentTarget.style.opacity = "0";
            }}
          />
          <div className="absolute inset-0 dark:from-background/40 dark:via-background/20 dark:to-background/10" />
        </div> */}

        {/* Reversed backdrop blur - starts hidden, appears on hover */}
        <motion.div
          className="absolute inset-0 backdrop-blur-md bg-muted/70 dark:bg-background/80 z-10"
          initial={false}
          animate={{
            y: isHovered ? 0 : "100%",
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
          }}
        />

        {/* Initial content - visible when not hovered */}
        {!isHovered && (
          <div className="relative z-20 flex flex-col justify-center items-center text-center h-full p-6">
            <Badge
              variant="secondary"
              className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm mb-4 bg-background/90 border-2 ${categoryData.iconColor} ${categoryData.textColor} shadow-sm`}
            >
              {quiz.category}
            </Badge>

            {/* This new div is the background with the blur */}
            <div className="rounded-xl shadow-md backdrop-blur-xl bg-background/30">
              <CardTitle
                className={`text-3xl font-bold leading-tight text-center text-foreground drop-shadow-sm p-2 `}
              >
                {quiz.title}
              </CardTitle>
            </div>
          </div>
        )}

        {/* Detailed content - shows on hover */}
        <AnimatePresence mode="wait">
          {isHovered && (
            <motion.div
              className="absolute inset-0 z-30 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant="secondary"
                    className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm
                    bg-background/90 border-2 ${categoryData.iconColor} 
                    ${categoryData.textColor} shadow-sm`}
                  >
                    {quiz.category}
                  </Badge>
                </div>

                <CardTitle
                  className="text-xl font-bold leading-tight line-clamp-2 mb-2 
                text-foreground drop-shadow-sm"
                >
                  {quiz.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="pb-4 flex-1">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <div
                      className={`p-1.5 rounded-full backdrop-blur-sm bg-background/90 
                    shadow-sm border border-background/50`}
                    >
                      <HelpCircle
                        className={`h-3 w-3 ${categoryData.iconColor}`}
                      />
                    </div>
                    <span className="font-medium drop-shadow-sm">
                      {quiz.questionCount} questions
                    </span>
                  </div>

                  {quiz.timeLimitInSeconds && (
                    <div className="flex items-center gap-2 text-foreground/80">
                      <div
                        className="p-1.5 rounded-full backdrop-blur-sm bg-background/90 
                      shadow-sm border border-background/50"
                      >
                        <Clock className="h-3 w-3 text-orange-500" />
                      </div>
                      <span className="font-medium drop-shadow-sm">
                        {secondsToMinutes(quiz.timeLimitInSeconds)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  variant="fancy"
                  className="w-full group/button"
                  size="default"
                >
                  <span className="relative z-10">Start Quiz</span>
                  <ArrowRight className="h-4 w-4 ml-2 relative z-10 transition-transform duration-200 group-hover/button:translate-x-1" />
                </Button>
              </CardFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
