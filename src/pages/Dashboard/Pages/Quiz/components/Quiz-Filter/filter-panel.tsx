/** Renders the collapsible panel containing all advanced filter select inputs. */

import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";

type AdvancedFilterPanelProps = {
  categories: QuestionCategory[];
  selectedCategoryId?: number;
  onCategoryChange: (id?: number) => void;

  difficulties: QuestionDifficulty[];
  selectedDifficultyId?: number;
  onDifficultyChange: (id?: number) => void;

  languages: QuestionLanguage[];
  selectedLanguageId?: number;
  onLanguageChange: (id?: number) => void;

//   selectedVisibility?: string;
//   onVisibilityChange: (value?: string) => void;

//   selectedIsPublished?: boolean;
//   onIsPublishedChange: (value?: boolean) => void;

//   selectedIsActive?: boolean;
//   onIsActiveChange: (value?: boolean) => void;
};

export const FilterPanel = ({
  categories,
  selectedCategoryId,
  onCategoryChange,
  difficulties,
  selectedDifficultyId,
  onDifficultyChange,
  languages,
  selectedLanguageId,
  onLanguageChange,
}: //   selectedVisibility,
//   onVisibilityChange,
//   selectedIsPublished,
//   onIsPublishedChange,
//   selectedIsActive,
//   onIsActiveChange,
AdvancedFilterPanelProps) => {
  return (
    <div className="bg-gradient-to-br from-card via-card/95 to-muted/30 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <CategorySelect
          label="Category"
          mode="filter"
          categories={categories}
          value={selectedCategoryId}
          onChange={onCategoryChange}
          includeAllOption
        />

        <DifficultySelect
          label="Difficulty"
          mode="filter"
          difficulties={difficulties}
          value={selectedDifficultyId}
          onChange={onDifficultyChange}
          includeAllOption
        />

        <LanguageSelect
          label="Language"
          mode="filter"
          languages={languages}
          value={selectedLanguageId}
          onChange={onLanguageChange}
          includeAllOption
        />

        {/* Visibility Filter */}
        {/* <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>Visibility
          </Label>
          <Select
            value={selectedVisibility || ""}
            onValueChange={(v) => onVisibilityChange(v || undefined)}
          >
            <SelectTrigger className="h-11 bg-background/50">
              <SelectValue placeholder="Any visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Public">🌍 Public</SelectItem>
              <SelectItem value="Private">🔒 Private</SelectItem>
              <SelectItem value="Friends">👥 Friends Only</SelectItem>
            </SelectContent>
          </Select>
        </div> */}

        {/* Publication Status Filter */}
        {/* <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>Publication
            Status
          </Label>
          <Select
            value={
              selectedIsPublished === undefined
                ? ""
                : selectedIsPublished
                ? "published"
                : "unpublished"
            }
            onValueChange={(v) =>
              onIsPublishedChange(v === "" ? undefined : v === "published")
            }
          >
            <SelectTrigger className="h-11 bg-background/50">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published">✅ Published</SelectItem>
              <SelectItem value="unpublished">📝 Draft</SelectItem>
            </SelectContent>
          </Select>
        </div> */}

        {/* Active Status Filter */}
        {/* <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500"></div>Active
            Status
          </Label>
          <Select
            value={
              selectedIsActive === undefined
                ? ""
                : selectedIsActive
                ? "active"
                : "inactive"
            }
            onValueChange={(v) =>
              onIsActiveChange(v === "" ? undefined : v === "active")
            }
          >
            <SelectTrigger className="h-11 bg-background/50">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">🟢 Active</SelectItem>
              <SelectItem value="inactive">⚪ Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div> */}
      </div>
    </div>
  );
};
