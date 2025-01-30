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
  categoryId: number;
  onCategoryChange: (id: number) => void;
  includeAllOption?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  categoryId,
  onCategoryChange,
  includeAllOption = true,
}) => {

  return (
    <div>
      <Select
        value={getCategoryNameById(categories, categoryId)}
        onValueChange={(name) => {
          const selectedId = getCategoryIdByName(categories, name);
          if (selectedId) {
            onCategoryChange(selectedId);
          }
        }}
      >
        <SelectTrigger className="min-w-[200px]">
          <SelectValue placeholder="--select a category--" />
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

export const getCategoryNameById = (
  categories: QuestionCategory[],
  id: number
) => {
  return categories.find((category) => category.id === id)?.name || "";
};

export const getCategoryIdByName = (
  categories: QuestionCategory[],
  name: string
) => {
  return categories.find((category) => category.name === name)?.id;
};
