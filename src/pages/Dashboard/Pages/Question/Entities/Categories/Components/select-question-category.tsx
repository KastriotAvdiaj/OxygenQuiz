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
  value: string; // Stringified ID (e.g., "1")
  onChange: (value: string) => void; // Receives stringified ID
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
  const isValueValid = categories.some(
    (category) => category.id.toString() === value
  );

  return (
    <div>
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger
          variant="quiz"
          className={`min-w-[200px] ${error ? "border-red-500" : ""}`}
        >
          <SelectValue
            className="text-foreground"
            placeholder={
              includeAllOption ? "All Categories" : "--Select Category--"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">All Categories</SelectItem>
          )}
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
