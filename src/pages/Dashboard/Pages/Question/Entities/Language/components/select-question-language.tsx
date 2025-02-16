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
  value: string | "";
  onLangaugeChange: (value: string | "all") => void;
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
}

export const LanguageSelect: React.FC<LangaugeSelectProps> = ({
  label,
  languages,
  value,
  onLangaugeChange,
  includeAllOption = true,
  error,
  clearErrors,
}) => {
  const isValueValid =
    value !== "all" &&
    languages.some((langauge) => langauge.language === value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
            onLangaugeChange(selectedValue === "all" ? "all" : selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger
          className={`min-w-[200px] ${error ? "border-red-500" : ""}`}
        >
          <SelectValue placeholder="--Select Language--" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {includeAllOption && (
            <SelectItem value="all">All Languages</SelectItem>
          )}
          {languages.map((language) => (
            <SelectItem key={language.id} value={language.language}>
              {language.language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
