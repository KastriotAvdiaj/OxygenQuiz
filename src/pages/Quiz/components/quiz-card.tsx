"use client";

import type React from "react";

import { useState, useCallback, useMemo } from "react";
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
import type { QuizSummaryDTO } from "@/types/quiz-types";

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

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Parse and process the color palette
  const colorPalette = useMemo(() => {
    try {
      if (!quiz.colorPaletteJson) return ["#6366f1", "#8b5cf6", "#06b6d4"];

      const colors = JSON.parse(quiz.colorPaletteJson);
      return Array.isArray(colors) && colors.length > 0
        ? colors
        : ["#6366f1", "#8b5cf6", "#06b6d4"];
    } catch (error) {
      console.warn("Failed to parse colorPaletteJson:", error);
      return ["#6366f1", "#8b5cf6", "#06b6d4"];
    }
  }, [quiz.colorPaletteJson]);

  function hexToRgba(hex: string, alpha: number) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const mainColor = colorPalette[0];
  const borderGradient = colorPalette.join(", ");
  const transparentGradient = quiz.gradient
    ? `linear-gradient(135deg, ${colorPalette
        .map((hex) => hexToRgba(hex, 0.4))
        .join(", ")})`
    : `${mainColor}60`;

  return (
    <motion.div
      className="h-full cursor-pointer w-full max-w-sm mx-auto rounded-lg"
      whileHover={{
        scale: 1.02,
        y: -2,
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
      <motion.div
        className="relative h-full rounded-lg"
        animate={{
          "--border-angle": ["0deg", "360deg"],
        }}
        transition={{
          duration: 4,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        }}
        style={
          {
            "--border-colors": borderGradient,
          } as React.CSSProperties
        }
      >
        <Card
          className="relative h-full flex flex-col overflow-hidden rounded-lg border-4 
     transition-all duration-300 group min-h-[180px] sm:min-h-[200px] md:min-h-[220px] shadow-md backdrop-blur-sm"
          style={{
            background: transparentGradient,
            borderImage: `conic-gradient(from var(--border-angle, 0deg), ${borderGradient}, ${colorPalette[0]}) 1`,
            borderImageSlice: 1,
          }}
        >
          {/* Hover overlay */}
          <motion.div
            className="absolute inset-0 backdrop-blur-sm z-10"
            style={{
              background: `${mainColor}05`,
            }}
            initial={false}
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          />

          {/* Initial content - visible when not hovered */}
          {!isHovered && (
            <div className="relative z-20 flex flex-col justify-center items-center text-center h-full p-3 sm:p-4 md:p-5">
              <Badge
                variant="secondary"
                className="text-xs font-medium px-2 py-1 rounded-full mb-2 sm:mb-3 border"
                style={{
                  backgroundColor: `${mainColor}20`,
                  borderColor: `${mainColor}40`,
                }}
              >
                {quiz.category}
              </Badge>

              <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold leading-tight text-center text-foreground drop-shadow-sm line-clamp-3">
                {quiz.title}
              </CardTitle>
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
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium px-2 py-1 rounded-full border"
                      style={{
                        backgroundColor: `${mainColor}20`,
                        borderColor: `${mainColor}40`,
                      }}
                    >
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
                      backgroundColor: `${mainColor}30`,
                      borderColor: `${mainColor}90`,
                    }}
                    size="sm"
                  >
                    <span className="relative z-10">Start Quiz</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2 relative z-10 transition-transform duration-200 group-hover/button:translate-x-1" />
                  </Button>
                </CardFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </motion.div>
  );
}
