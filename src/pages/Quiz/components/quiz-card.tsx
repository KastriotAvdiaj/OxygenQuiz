import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HelpCircle, Clock, Star } from "lucide-react";
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

// Preload images to prevent loading delays
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

export function QuizCard({ quiz }: QuizCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const categoryData = getCategoryImageData(quiz.category);

  // Preload image on component mount
  useEffect(() => {
    preloadImage(categoryData.image)
      .then(() => setImageLoaded(true))
      .catch(() => setImageError(true));
  }, [categoryData.image]);

  const handleStartQuiz = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Quiz start logic would go here
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <motion.div
      className="h-full cursor-pointer"
      whileHover={{
        scale: 1.02, // Reduced scale for smoother performance
        y: -4,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        duration: 0.2 // Faster transitions
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      layout={false} // Disable layout animations to prevent jitter
    >
      <Card
        className="relative h-full flex flex-col overflow-hidden rounded-xl border-2 
        hover:border-primary/50 transition-colors duration-300 group
        shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]
        dark:shadow-[0_4px_20px_rgba(255,255,255,0.03)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]
        dark:border-border/60 dark:hover:border-primary/40 min-h-[200px]"
      >
        {/* Category Background Image - Always rendered to prevent layout shift */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${categoryData.gradient} 
            transition-opacity duration-300`}
          />
          
          {!imageError && (
            <motion.img
              src={categoryData.image}
              alt={`${quiz.category} category`}
              className="w-full h-full object-cover"
              style={{
                opacity: imageLoaded ? 0.8 : 0,
              }}
              animate={{
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              loading="eager" // Load immediately for better UX
            />
          )}
          
          {/* Base overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/30 to-background/20 dark:from-background/80 dark:via-background/40 dark:to-background/20" />
        </div>

        {/* Blur Layer - optimized animation */}
        <motion.div
          className="absolute inset-0 backdrop-blur-sm bg-background/70 dark:bg-background/80 z-10"
          initial={false}
          animate={{ 
            y: isHovered ? "100%" : 0,
          }}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut"
          }}
        />

        {/* Always visible content */}
        <div className="relative z-20 flex flex-col justify-center items-center text-center h-full p-6">
          <Badge 
            variant="secondary" 
            className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm mb-4
            bg-background/90 border-2 ${categoryData.iconColor} 
            ${categoryData.textColor} shadow-sm`}
          >
            {quiz.category}
          </Badge>

          <CardTitle className="text-xl font-bold leading-tight text-center
          text-foreground drop-shadow-sm">
            {quiz.title}
          </CardTitle>
        </div>

        {/* Hidden content - simplified animations */}
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
                  
                  <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <Star className="h-3 w-3 fill-muted text-muted" />
                  </div>
                </div>

                <CardTitle className="text-xl font-bold leading-tight line-clamp-2 mb-2 
                text-foreground drop-shadow-sm">
                  {quiz.title}
                </CardTitle>

                <CardDescription className="text-sm leading-relaxed line-clamp-3 
                text-foreground/80 drop-shadow-sm">
                  {quiz.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4 flex-1">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <div className={`p-1.5 rounded-full backdrop-blur-sm bg-background/90 
                    shadow-sm border border-background/50`}>
                      <HelpCircle className={`h-3 w-3 ${categoryData.iconColor}`} />
                    </div>
                    <span className="font-medium drop-shadow-sm">{quiz.questionCount} questions</span>
                  </div>
                  
                  {quiz.timeLimitInSeconds && (
                    <div className="flex items-center gap-2 text-foreground/80">
                      <div className="p-1.5 rounded-full backdrop-blur-sm bg-background/90 
                      shadow-sm border border-background/50">
                        <Clock className="h-3 w-3 text-orange-500" />
                      </div>
                      <span className="font-medium drop-shadow-sm">{secondsToMinutes(quiz.timeLimitInSeconds)}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  variant="fancy"
                  className="w-full group/button font-semibold transition-all duration-200 
                  hover:shadow-lg hover:shadow-primary/25 relative overflow-hidden
                  backdrop-blur-sm bg-primary/95 hover:bg-primary"
                  onClick={handleStartQuiz}
                  size="default"
                >
                  <span className="relative z-10">Start Quiz</span>
                  <ArrowRight className="h-4 w-4 ml-2 relative z-10 transition-transform duration-200 group-hover/button:translate-x-1" />
                </Button>
              </CardFooter>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simplified hover accent line */}
        <motion.div
          className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${categoryData.gradient} z-40`}
          initial={false}
          animate={{ 
            scaleX: isHovered ? 1 : 0,
            opacity: isHovered ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />
      </Card>
    </motion.div>
  );
}