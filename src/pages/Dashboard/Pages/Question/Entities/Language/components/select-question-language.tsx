import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionLanguage } from "@/types/ApiTypes";
import { Label } from "@/components/ui/form";

interface LangaugeSelectProps {
  label?: string;
  languages: QuestionLanguage[];
  value: string;
  onChange: (value: string) => void;
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
}

export const LanguageSelect: React.FC<LangaugeSelectProps> = ({
  label,
  languages,
  value,
  onChange,
  includeAllOption = true,
  error,
  clearErrors,
}) => {
  const isValueValid = languages.some(
    (langauge) => langauge.id.toString() === value
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue === "all" ? "all" : selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger
          variant="quiz"
          className={`min-w-[200px] ${error ? "border-red-500" : ""}`}
        >
          <SelectValue placeholder="--Select Language--" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {includeAllOption && (
            <SelectItem value="all">All Languages</SelectItem>
          )}
          {languages.map((language) => (
            <SelectItem key={language.id} value={language.id.toString()}>
              {language.language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
