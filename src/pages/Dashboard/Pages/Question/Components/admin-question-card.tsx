"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/form";
import { Question } from "@/types/ApiTypes";

interface AdminQuestionCardProps {
  question: Question;
}

export const AdminQuestionCard: React.FC<AdminQuestionCardProps> = ({
  question,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => setIsExpanded(!isExpanded);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = isExpanded
        ? `${contentRef.current.scrollHeight}px`
        : "0";
    }
  }, [isExpanded]);

  return (
    <Card
      ref={cardRef}
      className="max-w-[400px] cursor-pointer border border-[0.1px] bg-card rounded-lg mx-auto overflow-hidden transition-shadow duration-200 shadow hover:shadow-lg hover:scale-105 transition-all ease-in-out"
    >
      <div className=" flex items-start justify-between p-4">
        <div className="flex-grow flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{question.text}</h3>
            <Label className="text-sm text-gray-500">{question.category}</Label>
          </div>
          <div
            onClick={handleToggle}
            className="w-fit border py-1 px-2 cursor-pointer "
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </>
            ) : (
              <>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </>
            )}
          </div>
        </div>
        <Badge
          className={`${getDifficultyColor(
            question.difficultyDisplay
          )} text-white ml-2`}
        >
          {question.difficultyDisplay}
        </Badge>
      </div>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: 0 }}
      >
        <CardContent className="pt-0 pb-4">
          <ul className="space-y-2">
            {question.answerOptions.map((option) => (
              <li
                key={option.id}
                className={`p-2 rounded ${
                  option.isCorrect
                    ? "bg-green-100 dark:bg-green-900"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {option.text}
                {option.isCorrect && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    (Correct)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </div>
    </Card>
  );
};
