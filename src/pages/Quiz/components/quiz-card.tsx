"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Trophy, HelpCircle } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  questionCount: number;
  category: string;
  emoji: string;
  color: string;
}

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const difficultyStyles = {
    Beginner:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Intermediate:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }[quiz.difficulty];

  const difficultyIcon = {
    Beginner: <Brain className="h-4 w-4 mr-1" />,
    Intermediate: <Brain className="h-4 w-4 mr-1" />,
    Advanced: <Trophy className="h-4 w-4 mr-1" />,
  }[quiz.difficulty];

  const handleStartQuiz = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      className="h-full"
      whileHover={{
        scale: 1.03,
        rotate: isHovered ? 0 : 0.5,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative h-full rounded-2xl overflow-hidden shadow-lg border-2 border-transparent transition-all duration-300 ${
          isHovered ? "border-primary/50 shadow-xl" : ""
        }`}
      >
        {/* Gradient background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${quiz.color} opacity-10 dark:opacity-20`}
        />

        {/* Card content */}
        <div className="relative p-6 h-full flex flex-col">
          {/* Category and emoji */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-4xl">{quiz.emoji}</span>
            <span className="text-sm font-medium text-muted-foreground bg-background/80 px-3 py-1 rounded-full">
              {quiz.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm mb-6">
            {quiz.description}
          </p>

          {/* Quiz details */}
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-4">
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${difficultyStyles}`}
              >
                {difficultyIcon}
                {quiz.difficulty}
              </div>

              <div className="inline-flex items-center text-sm text-muted-foreground">
                <HelpCircle className="h-4 w-4 mr-1" />
                {quiz.questionCount} questions
              </div>
            </div>

            {/* Start button */}
            <Button
              className="w-full group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
              onClick={handleStartQuiz}
            >
              Start Quiz
              <motion.div
                animate={{ x: isHovered ? 4 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                <ArrowRight className="ml-2 h-4 w-4" />
              </motion.div>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
