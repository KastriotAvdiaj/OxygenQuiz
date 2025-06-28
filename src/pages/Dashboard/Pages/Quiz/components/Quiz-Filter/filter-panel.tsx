/** Renders the collapsible panel containing all advanced filter select inputs. */

import { Label } from "@/components/ui/form";
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
} from "./types";

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

  selectedVisibility?: string;
  onVisibilityChange: (value?: string) => void;

  selectedIsPublished?: boolean;
  onIsPublishedChange: (value?: boolean) => void;

  selectedIsActive?: boolean;
  onIsActiveChange: (value?: boolean) => void;
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
  selectedVisibility,
  onVisibilityChange,
  selectedIsPublished,
  onIsPublishedChange,
  selectedIsActive,
  onIsActiveChange,
}: AdvancedFilterPanelProps) => {
  return (
    <div className="bg-gradient-to-br from-card via-card/95 to-muted/30 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Category Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>Category
          </Label>
          <Select
            value={selectedCategoryId?.toString() || ""}
            onValueChange={(v) => onCategoryChange(v ? Number(v) : undefined)}
          >
            <SelectTrigger className="h-11 bg-background/50">
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>Difficulty
          </Label>
          <Select
            value={selectedDifficultyId?.toString() || ""}
            onValueChange={(v) => onDifficultyChange(v ? Number(v) : undefined)}
          >
            <SelectTrigger className="h-11 bg-background/50">
              <SelectValue placeholder="Any difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>Language
          </Label>
          <Select
            value={selectedLanguageId?.toString() || ""}
            onValueChange={(v) => onLanguageChange(v ? Number(v) : undefined)}
          >
            <SelectTrigger className="h-11 bg-background/50">
              <SelectValue placeholder="Any language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility Filter */}
        <div className="space-y-3">
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
        </div>

        {/* Publication Status Filter */}
        <div className="space-y-3">
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
        </div>

        {/* Active Status Filter */}
        <div className="space-y-3">
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
        </div>
      </div>
    </div>
  );
};
