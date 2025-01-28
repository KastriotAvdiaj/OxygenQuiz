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
  difficultyId: number;
  onDifficultyChange: (id: number) => void;
  includeAllOption?: boolean;
}

export const DifficultySelect: React.FC<DifficultySelectProps> = ({
  difficulties,
  difficultyId,
  onDifficultyChange,
  includeAllOption = true,
}) => {
  const selectedLevel =
    difficulties.find((d) => d.id === difficultyId)?.level || "";

  return (
    <div>
      <Select
        value={selectedLevel}
        onValueChange={(level) => {
          const selectedId = difficulties.find((d) => d.level === level)?.id;
          if (selectedId) {
            onDifficultyChange(selectedId);
          }
        }}
      >
        <SelectTrigger className="min-w-[200px]">
          <SelectValue placeholder="--select a difficulty--" />
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

export const getDifficultyLevelById = (
  difficulties: QuestionDifficulty[],
  id: number
) => difficulties.find((d) => d.id === id)?.level || "";

export const getDifficultyIdByLevel = (
  difficulties: QuestionDifficulty[],
  level: string
) => difficulties.find((d) => d.level === level)?.id || null;
