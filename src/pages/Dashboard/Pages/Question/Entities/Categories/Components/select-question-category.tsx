import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionCategory } from "@/types/ApiTypes";

interface CategorySelectProps {
  categories: QuestionCategory[];
  value: string | "";
  onChange: (value: string | "all") => void;
  includeAllOption?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  value,
  onChange,
  includeAllOption = true,
}) => {
  const isValueValid =
    value !== "all" && categories.some((category) => category.name === value);

  return (
    <Select
      value={isValueValid ? value : ""}
      onValueChange={(selectedValue) => {
        onChange(selectedValue === "all" ? "all" : selectedValue);
      }}
    >
      <SelectTrigger className="min-w-[200px]">
        <SelectValue placeholder="--Select category--" />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && (
          <SelectItem value="all">All Categories</SelectItem>
        )}
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.name}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
