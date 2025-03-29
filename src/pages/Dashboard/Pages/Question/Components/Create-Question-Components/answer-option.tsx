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
      <div className="flex-1">
        <Label
          htmlFor={`answer-${index}`}
          className="block text-sm font-medium text-foreground"
        ></Label>
        <Input
          variant={`${isCorrect ? "isCorrect" : "quiz"}`}
          color="red"
          id={`answer-${index}`}
          placeholder={`Answer Option ${index + 1}`}
          registration={textRegistration}
          error={error}
          className={`py-2 w-full ${error ? "border-red-500" : ""} ${
            isCorrect ? "border-2 border-green-500" : ""
          }`}
        />
      </div>
      <div className="flex flex-col items-center mt-3">
        <Switch
          id={`correct-${index}`}
          checked={isCorrect}
          onCheckedChange={onCorrectToggle}
          className="shadow-md"
        />
        <Label
          htmlFor={`correct-${index}`}
          className="text-xs text-gray-600 mt-1"
        >
          Correct
        </Label>
      </div>
      {extraSettings && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onRemove}
          disabled={disableRemove}
          className="rounded-sm bg-red-400"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
