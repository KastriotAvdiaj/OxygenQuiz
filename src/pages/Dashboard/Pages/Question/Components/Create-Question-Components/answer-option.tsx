import React from "react";
import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { FieldError } from "react-hook-form";

interface AnswerOptionProps {
  index: number;
  textRegistration: ReturnType<any>;
  isCorrect: boolean;
  onCorrectToggle: () => void;
  error?: FieldError;
  onRemove: () => void;
  disableRemove?: boolean;
  extraSettings?: boolean;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  index,
  textRegistration,
  isCorrect,
  onCorrectToggle,
  error,
  onRemove,
  disableRemove = false,
  extraSettings = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 relative">
        <Label
          htmlFor={`answer-${index}`}
          className="block text-sm font-medium text-foreground"
        ></Label>
        <div className="relative">
          <Input
            variant={isCorrect ? "isCorrect" : "isIncorrect"}
            id={`answer-${index}`}
            placeholder={`Answer Option ${index + 1}`}
            registration={textRegistration}
            error={error}
            className={`py-2 w-full pr-12 ${error ? "border-red-500" : ""}`}
          />
          <button
            type="button"
            onClick={onCorrectToggle}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
              isCorrect
                ? "bg-green-500 text-white"
                : "bg-primary/20 hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40"
            }`}
          >
            {isCorrect && <Check className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {extraSettings && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onRemove}
          disabled={disableRemove}
          className="rounded-sm bg-red-400 mt-3"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};