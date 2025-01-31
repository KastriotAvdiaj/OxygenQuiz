import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionDifficulty } from "@/types/ApiTypes";

interface DifficultySelectProps {
  difficulties: QuestionDifficulty[];
  value: string | "";
  onDifficultyChange: (value: string | "all") => void;
  includeAllOption?: boolean;
}

export const DifficultySelect: React.FC<DifficultySelectProps> = ({
  difficulties,
  value,
  onDifficultyChange,
  includeAllOption = true,
}) => {
  const isValueValid =
    value !== "all" &&
    difficulties.some((difficulty) => difficulty.level === value);

  return (
    <div>
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) =>
          onDifficultyChange(selectedValue === "all" ? "all" : selectedValue)
        }
      >
        <SelectTrigger className="min-w-[200px]">
          <SelectValue placeholder="--Select difficulty--" />
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
    </div>
  );
};
