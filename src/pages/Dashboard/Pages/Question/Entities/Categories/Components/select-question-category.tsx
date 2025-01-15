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
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  includeAllOption?: boolean; // Include "All Categories" option
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  includeAllOption = true,
}) => {
  return (
    <div className="">
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="min-w-[200px]">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
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
    </div>
  );
};
