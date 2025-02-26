import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionDifficulty } from "@/types/ApiTypes";
import { Label } from "@/components/ui/form";

interface DifficultySelectProps {
  label?: string;
  difficulties: QuestionDifficulty[];
  value: string | "";
  onChange: (value: string | "all") => void;
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
}

export const DifficultySelect: React.FC<DifficultySelectProps> = ({
  label,
  difficulties,
  value,
  onChange,
  includeAllOption = true,
  error,
  clearErrors,
}) => {
  const isValueValid =
    value !== "all" &&
    difficulties.some((difficulty) => difficulty.level === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue === "all" ? "all" : selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger
          className={`min-w-[200px] ${error ? "border-red-500" : ""}`}
        >
          <SelectValue placeholder="--Select Difficulty--" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {includeAllOption && (
            <SelectItem value="all">All Difficulties</SelectItem>
          )}
          {difficulties.map((difficulty) => (
            <SelectItem key={difficulty.id} value={difficulty.level}>
              {difficulty.level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
