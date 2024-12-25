import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionCategory } from "@/types/ApiTypes";
import { Label } from "@/components/ui/form";

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
    <div>
      <Label>Category</Label>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[200px] sm:w-auto">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="w-[200px] sm:w-auto">
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
