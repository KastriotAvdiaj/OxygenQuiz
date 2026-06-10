import { Button, Card } from "@/components/ui";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { TriStateSelect, type TriState } from "@/components/ui/tri-state-select";
import {
  ActiveFilterPills,
  type ActiveFilterPill,
} from "@/components/ui/active-filter-pills";
import { Filter } from "lucide-react";
import { RiFilterOffLine } from "react-icons/ri";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { SearchInput } from "@/lib/Search-Input";

// Re-exported so existing importers (Quizzes, MyQuizzes) keep their import path.
export type { TriState };

export type QuizFilterUser = { id: string; username: string };

const VISIBILITY_OPTIONS = [
  { label: "Public", value: "Public" },
  { label: "Private", value: "Private" },
  { label: "Friends", value: "Friends" },
];

interface QuizFiltersPanelProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;

  categories: QuestionCategory[];
  selectedCategoryIds: number[];
  onCategoryIdsChange: (ids: number[]) => void;

  difficulties: QuestionDifficulty[];
  selectedDifficultyIds: number[];
  onDifficultyIdsChange: (ids: number[]) => void;

  languages: QuestionLanguage[];
  selectedLanguageIds: number[];
  onLanguageIdsChange: (ids: number[]) => void;

  selectedVisibilities: string[];
  onVisibilitiesChange: (values: string[]) => void;

  published: TriState;
  onPublishedChange: (value: TriState) => void;

  active: TriState;
  onActiveChange: (value: TriState) => void;

  createdFrom: string;
  createdTo: string;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;

  // Admin-only author filter. Omit `users` to hide it (e.g. on a personal quizzes page).
  users?: QuizFilterUser[];
  selectedUserIds?: string[];
  onUserIdsChange?: (ids: string[]) => void;
}

export const QuizFiltersPanel = (props: QuizFiltersPanelProps) => {
  const {
    searchTerm,
    onSearchTermChange,
    categories,
    selectedCategoryIds,
    onCategoryIdsChange,
    difficulties,
    selectedDifficultyIds,
    onDifficultyIdsChange,
    languages,
    selectedLanguageIds,
    onLanguageIdsChange,
    selectedVisibilities,
    onVisibilitiesChange,
    published,
    onPublishedChange,
    active,
    onActiveChange,
    createdFrom,
    createdTo,
    onCreatedFromChange,
    onCreatedToChange,
    users,
    selectedUserIds = [],
    onUserIdsChange,
  } = props;

  const showUserFilter = Boolean(users && onUserIdsChange);

  const activeCount =
    selectedCategoryIds.length +
    selectedDifficultyIds.length +
    selectedLanguageIds.length +
    selectedVisibilities.length +
    selectedUserIds.length +
    (published !== "any" ? 1 : 0) +
    (active !== "any" ? 1 : 0) +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0);

  const hasActiveFilters = Boolean(searchTerm) || activeCount > 0;

  const resetFilters = () => {
    onSearchTermChange("");
    onCategoryIdsChange([]);
    onDifficultyIdsChange([]);
    onLanguageIdsChange([]);
    onVisibilitiesChange([]);
    onPublishedChange("any");
    onActiveChange("any");
    onCreatedFromChange("");
    onCreatedToChange("");
    onUserIdsChange?.([]);
  };

  // ── Active-filter pills ──────────────────────────────────────────────
  const idPills = (
    prefix: string,
    ids: number[],
    options: { id: number; label: string }[],
    onChange: (ids: number[]) => void
  ): ActiveFilterPill[] =>
    ids.map((id) => ({
      id: `${prefix}-${id}`,
      label: options.find((o) => o.id === id)?.label ?? `#${id}`,
      onRemove: () => onChange(ids.filter((x) => x !== id)),
    }));

  const pills: ActiveFilterPill[] = [
    ...idPills("category", selectedCategoryIds,
      categories.map((c) => ({ id: c.id, label: `Category: ${c.name}` })), onCategoryIdsChange),
    ...idPills("difficulty", selectedDifficultyIds,
      difficulties.map((d) => ({ id: d.id, label: `Difficulty: ${d.level}` })), onDifficultyIdsChange),
    ...idPills("language", selectedLanguageIds,
      languages.map((l) => ({ id: l.id, label: `Language: ${l.language}` })), onLanguageIdsChange),
    ...selectedVisibilities.map((v) => ({
      id: `visibility-${v}`,
      label: `Visibility: ${v}`,
      onRemove: () => onVisibilitiesChange(selectedVisibilities.filter((x) => x !== v)),
    })),
    ...selectedUserIds.map((uid) => ({
      id: `user-${uid}`,
      label: `Author: ${users?.find((u) => u.id === uid)?.username ?? uid}`,
      onRemove: () => onUserIdsChange?.(selectedUserIds.filter((x) => x !== uid)),
    })),
  ];

  if (published !== "any")
    pills.push({ id: "published", label: `Published: ${published === "yes" ? "Yes" : "No"}`, onRemove: () => onPublishedChange("any") });
  if (active !== "any")
    pills.push({ id: "active", label: `Active: ${active === "yes" ? "Yes" : "No"}`, onRemove: () => onActiveChange("any") });
  if (createdFrom)
    pills.push({ id: "from", label: `From: ${createdFrom}`, onRemove: () => onCreatedFromChange("") });
  if (createdTo)
    pills.push({ id: "to", label: `To: ${createdTo}`, onRemove: () => onCreatedToChange("") });

  return (
    <Card className="flex flex-col gap-4 p-4 bg-card border dark:border-foreground/30 shadow-sm">
      <div className="border-b pb-4 dark:border-foreground/10">
         <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          Search
        </h2>
        <SearchInput
          placeholder="Search quizzes..."
          onSearch={onSearchTermChange}
          initialValue={searchTerm}
          className="!my-0"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </h3>
          {hasActiveFilters && (
            <Button
              onClick={resetFilters}
              variant="ghost"
              className="flex items-center gap-1.5 rounded-md text-xs text-red-500 hover:text-red-600 dark:hover:bg-red-950/40 hover:bg-red-50 bg-red-50/50 dark:border-red-900/30 px-2 border border-red-100 h-7 transition-colors">
              <RiFilterOffLine className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Grid layout for filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MultiSelect
            label="Categories"
            placeholder="All categories"
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
            selected={selectedCategoryIds}
            onChange={onCategoryIdsChange}
          />
          <MultiSelect
            label="Difficulties"
            placeholder="All difficulties"
            options={difficulties.map((d) => ({ label: d.level, value: d.id }))}
            selected={selectedDifficultyIds}
            onChange={onDifficultyIdsChange}
          />
          <MultiSelect
            label="Languages"
            placeholder="All languages"
            options={languages.map((l) => ({ label: l.language, value: l.id }))}
            selected={selectedLanguageIds}
            onChange={onLanguageIdsChange}
          />
          <MultiSelect<string>
            label="Visibility"
            placeholder="Any visibility"
            options={VISIBILITY_OPTIONS}
            selected={selectedVisibilities}
            onChange={onVisibilitiesChange}
          />
          <TriStateSelect
            label="Published"
            value={published}
            onChange={onPublishedChange}
            yesLabel="Published"
            noLabel="Unpublished"
          />
          <TriStateSelect
            label="Active"
            value={active}
            onChange={onActiveChange}
            yesLabel="Active"
            noLabel="Inactive"
          />
          {showUserFilter && (
            <MultiSelect<string>
              label="Author"
              placeholder="Any author"
              searchable
              options={users!.map((u) => ({ label: u.username, value: u.id }))}
              selected={selectedUserIds}
              onChange={(ids) => onUserIdsChange!(ids)}
              className="sm:col-span-2"
            />
          )}
          <DateRangeFilter
            label="Created date"
            from={createdFrom}
            to={createdTo}
            onFromChange={onCreatedFromChange}
            onToChange={onCreatedToChange}
            className="sm:col-span-2"
          />
        </div>
      </div>

      {pills.length > 0 && (
        <div className="pt-2 border-t dark:border-foreground/10">
          <ActiveFilterPills pills={pills} onClearAll={resetFilters} />
        </div>
      )}
    </Card>
  );
};