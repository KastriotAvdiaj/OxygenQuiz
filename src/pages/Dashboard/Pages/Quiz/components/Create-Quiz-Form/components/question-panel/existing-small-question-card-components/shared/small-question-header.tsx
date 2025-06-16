import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Globe, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface SmallQuestionHeaderProps {
  icon: React.ReactNode;
  isPrivate: boolean;
  questionType: string;
  badgeColor: string;
  isActive?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const SmallQuestionHeader: React.FC<SmallQuestionHeaderProps> = ({
  icon,
  isPrivate,
  questionType,
  badgeColor,
  isActive = false,
  onRemove,
  className
}) => (
  <div className={cn(
    "px-4 py-2 flex justify-between items-center",
    isActive 
      ? "bg-primary/10" 
      : "bg-gradient-to-r from-background to-muted",
    className
  )}>
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs",
        badgeColor
      )}>
        {icon}
      </div>
      <Badge variant="outline" className="h-5 px-2 gap-1">
        {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
        <span className="text-xs">{isPrivate ? "Private" : "Public"}</span>
      </Badge>
      <Badge
        variant="secondary"
        className={cn("h-5 px-2 text-xs", badgeColor)}
      >
        {questionType}
      </Badge>
    </div>

    {onRemove && (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-red-500"
        onClick={onRemove}
        title="Remove question"
      >
        <Trash2 size={14} />
      </Button>
    )}
  </div>
);