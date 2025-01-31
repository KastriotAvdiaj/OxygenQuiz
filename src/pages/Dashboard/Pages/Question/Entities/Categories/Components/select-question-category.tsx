import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";
import { QuestionCategory } from "@/types/ApiTypes";

interface CategorySelectProps {
  label?: string;
  categories: QuestionCategory[];
  value: string | "";
  onChange: (value: string | "all") => void;
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  label,
  categories,
  value,
  onChange,
  includeAllOption = true,
  error,
  clearErrors,
}) => {
  const isValueValid =
    value !== "all" && categories.some((category) => category.name === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
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
          <SelectValue
            placeholder={`${
              includeAllOption ? "All Categories" : "--Select Category--"
            }`}
          />
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
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
