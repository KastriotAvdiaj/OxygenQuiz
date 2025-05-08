import { Input } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";

interface QuestionFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;

  categories: QuestionCategory[];
  selectedCategoryId?: number | string; // Allow string for "all"
  onCategoryChange: (categoryId?: number | string) => void;

  difficulties: QuestionDifficulty[];
  selectedDifficultyId?: number | string;
  onDifficultyChange: (difficultyId?: number | string) => void;

  languages: QuestionLanguage[];
  selectedLanguageId?: number | string;
  onLanguageChange: (languageId?: number | string) => void;

  visibility?: string;
  onVisibilityChange: (visibility?: string) => void;
}

export const QuestionFilters = ({
  searchTerm,
  onSearchTermChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  difficulties,
  selectedDifficultyId,
  onDifficultyChange,
  languages,
  selectedLanguageId,
  onLanguageChange,
}: QuestionFiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-md bg-card">
      <Input
        placeholder="Search questions..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="lg:col-span-1"
      />

      <Select
        value={selectedCategoryId?.toString() || ""}
        onValueChange={(value) =>
          onCategoryChange(value ? parseInt(value) : undefined)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedDifficultyId?.toString() || ""}
        onValueChange={(value) =>
          onDifficultyChange(value ? parseInt(value) : undefined)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Difficulties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Difficulties</SelectItem>
          {difficulties.map((difficulty) => (
            <SelectItem key={difficulty.id} value={difficulty.id.toString()}>
              {difficulty.level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedLanguageId?.toString() || ""}
        onValueChange={(value) =>
          onLanguageChange(value ? parseInt(value) : undefined)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="All Languages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Languages</SelectItem>
          {languages.map((language) => (
            <SelectItem key={language.id} value={language.id.toString()}>
              {language.language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
