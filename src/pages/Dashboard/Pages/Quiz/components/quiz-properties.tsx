// src/pages/Dashboard/Pages/Quiz/quizProperties.tsx
import React from "react";
import {
  Calendar,
  Clock,
  Globe,
  Hash,
  List,
  Tag,
  Eye,
  EyeOff,
  StampIcon,
} from "lucide-react";
import formatDate from "@/lib/date-format";
import { Quiz } from "@/types/quiz-types";

export interface QuizProperty {
  label: string;
  getIcon: (quiz: Quiz) => React.ReactNode;
  getValue: (quiz: Quiz) => React.ReactNode;
}

interface QuizPropertiesProps {
  quiz: Quiz;
}

export const QuizProperties = ({ quiz }: QuizPropertiesProps) => {
  console.log(quiz);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {quizProperties.map((property) => (
        <div key={property.label} className="flex items-center gap-2">
          {property.getIcon(quiz)}
          <span className="font-bold">{property.label}:</span>
          <span>{property.getValue(quiz)}</span>
        </div>
      ))}
    </div>
  );
};

export const quizProperties: QuizProperty[] = [
  {
    label: "ID",
    getIcon: () => <Hash className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => quiz.id,
  },
  {
    label: "Language",
    getIcon: () => <Globe className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => quiz.language.language,
  },
  {
    label: "Category",
    getIcon: () => <Tag className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => quiz.category.name,
  },
  {
    label: "Difficulty",
    getIcon: () => <StampIcon className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => quiz.difficulty.level,
  },
  {
    label: "Time Limit",
    getIcon: () => <Clock className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => `${quiz.timeLimitInSeconds} seconds`,
  },
  {
    label: "Created At",
    getIcon: () => <Calendar className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => formatDate(quiz.createdAt),
  },
  {
    label: "Published",
    getIcon: (quiz) =>
      quiz.isPublished ? (
        <Eye className="h-5 w-5 text-green-500" />
      ) : (
        <EyeOff className="h-5 w-5 text-red-500" />
      ),
    getValue: (quiz) => (quiz.isPublished ? "Yes" : "No"),
  },
  {
    label: "Number of Questions",
    getIcon: () => <List className="h-5 w-5 text-muted-foreground" />,
    getValue: (quiz) => quiz.questionCount,
  },
];
