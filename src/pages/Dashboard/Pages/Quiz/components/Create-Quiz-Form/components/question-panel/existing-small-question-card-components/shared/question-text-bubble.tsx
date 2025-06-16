import React from "react";
import { cn } from "@/utils/cn";

interface QuestionBubbleProps {
  text: string;
  className?: string;
}

export const QuestionBubble: React.FC<QuestionBubbleProps> = ({ 
  text, 
  className 
}) => (
  <div className={cn(
    "mt-1 mb-3 border border-foreground/30 rounded-lg px-3 py-2 text-sm bg-background relative shadow-inner",
    className
  )}>
    <div className="absolute -top-2 left-3 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
    {text || "Empty question"}
  </div>
);