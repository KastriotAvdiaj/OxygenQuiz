import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { cn } from "@/utils/cn";

interface SmallQuestionFooterProps {
  categoryName: string;
  difficultyLevel: string;
  extraBadges?: React.ReactNode[];
  className?: string;
}

export const SmallQuestionFooter: React.FC<SmallQuestionFooterProps> = ({
  categoryName,
  difficultyLevel,
  extraBadges = [],
  className,
}) => (
  <div
    className={cn(
      "flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground border-foreground/30 mt-2 border-t pt-2",
      className
    )}
  >
    <div className="flex items-center gap-2">
      {extraBadges.map((badge, index) => (
        <React.Fragment key={index}>{badge}</React.Fragment>
      ))}
      <Badge
        variant="outline"
        className="flex items-center gap-1 px-2 py-0 h-5 text-xs"
      >
        <Tag size={10} />
        {categoryName}
      </Badge>
    </div>

    <Badge
      variant="outline"
      className="flex items-center gap-1 px-2 py-0 h-5 text-xs border"
    >
      <span>{difficultyLevel}</span>
    </Badge>
  </div>
);
