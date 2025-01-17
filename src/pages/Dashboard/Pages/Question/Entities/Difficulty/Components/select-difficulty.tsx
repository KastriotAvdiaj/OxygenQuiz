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
  selectedDifficulty: string;
  onDifficultyChange: (value: string) => void;
  includeAllOption?: boolean;
}
export const DifficultySelect: React.FC<DifficultySelectProps> = ({
  difficulties,
  selectedDifficulty,
  onDifficultyChange,
  includeAllOption = true,
}) => {
  return (
    <div className="">
      <Select value={selectedDifficulty} onValueChange={onDifficultyChange}>
        <SelectTrigger className="min-w-[200px]">
          { <SelectValue placeholder="--Select a difficulty--" />}
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
