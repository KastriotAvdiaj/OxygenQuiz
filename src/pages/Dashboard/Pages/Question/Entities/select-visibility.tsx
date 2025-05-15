import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";

interface VisibilitySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  clearErrors?: () => void;
}

export const VisibilitySelect: React.FC<VisibilitySelectProps> = ({
  label,
  value,
  onChange,
  error,
  clearErrors,
}) => {
  const visibilityOptions = ["Global", "Private"];
  const isValueValid = visibilityOptions.includes(value);

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
          <SelectValue placeholder="--Select Visibility--" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {visibilityOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
