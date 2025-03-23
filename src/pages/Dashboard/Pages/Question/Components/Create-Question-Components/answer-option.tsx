import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "react-hook-form";

interface AnswerOptionProps {
  index: number;
  textRegistration: ReturnType<any>;
  isCorrect: boolean;
  onCorrectToggle: () => void;
  error?: FieldError;
  onRemove: () => void;
  disableRemove?: boolean;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  index,
  textRegistration,
  isCorrect,
  onCorrectToggle,
  error,
  onRemove,
  disableRemove = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <Label htmlFor={`answer-${index}`} className="block text-sm font-medium text-foreground">
          Answer Option {index + 1}
        </Label>
        <Input
          id={`answer-${index}`}
          placeholder={`Answer Option ${index + 1}`}
          registration={textRegistration}
          error={error}
          className={`py-2 w-full ${error ? "border-red-500" : ""} ${isCorrect ? "border-2 border-green-500" : ""}`}
        />
      </div>
      <div className="flex flex-col items-center">
        <Switch
          id={`correct-${index}`}
          checked={isCorrect}
          onCheckedChange={onCorrectToggle}
          className="shadow-md"
        />
        <Label htmlFor={`correct-${index}`} className="text-xs text-gray-600 mt-1">
          Correct
        </Label>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={onRemove}
        disabled={disableRemove}
        className="rounded-sm"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
