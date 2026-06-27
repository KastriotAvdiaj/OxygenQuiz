import { Button, Card } from "@/components/ui";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/form";
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

export type QuizFilterUser = { id: string; username: string };

// Single access/lifecycle dimension — replaces the old Visibility + Published + Active filters.
const STATUS_OPTIONS = [
  { label: "Draft", value: "Draft" },
  { label: "Unlisted", value: "Unlisted" },
  { label: "Public", value: "Public" },
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

  selectedStatuses: string[];
  onStatusesChange: (values: string[]) => void;

  createdFrom: string;
  createdTo: string;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;

  // Admin-only author filter. Omit `users` to hide it (e.g. on a personal quizzes page).
  users?: QuizFilterUser[];
  selectedUserIds?: string[];
  onUserIdsChange?: (ids: string[]) => void;

  // Admin-only "show deleted" toggle. Omit `onShowDeletedChange` to hide it.
  showDeleted?: boolean;
  onShowDeletedChange?: (value: boolean) => void;
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
    selectedStatuses,
    onStatusesChange,
    createdFrom,
    createdTo,
    onCreatedFromChange,
    onCreatedToChange,
    users,
    selectedUserIds = [],
    onUserIdsChange,
    showDeleted = false,
    onShowDeletedChange,
  } = props;

  const showUserFilter = Boolean(users && onUserIdsChange);
  const showDeletedToggle = Boolean(onShowDeletedChange);

  const activeCount =
    selectedCategoryIds.length +
    selectedDifficultyIds.length +
    selectedLanguageIds.length +
    selectedStatuses.length +
    selectedUserIds.length +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0);

  const hasActiveFilters = Boolean(searchTerm) || activeCount > 0;

  const resetFilters = () => {
    onSearchTermChange("");
    onCategoryIdsChange([]);
    onDifficultyIdsChange([]);
    onLanguageIdsChange([]);
    onStatusesChange([]);
    onCreatedFromChange("");
    onCreatedToChange("");
    onUserIdsChange?.([]);
    onShowDeletedChange?.(false);
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
    ...selectedStatuses.map((v) => ({
      id: `status-${v}`,
      label: `Status: ${v}`,
      onRemove: () => onStatusesChange(selectedStatuses.filter((x) => x !== v)),
    })),
    ...selectedUserIds.map((uid) => ({
      id: `user-${uid}`,
      label: `Author: ${users?.find((u) => u.id === uid)?.username ?? uid}`,
      onRemove: () => onUserIdsChange?.(selectedUserIds.filter((x) => x !== uid)),
    })),
  ];

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
            label="Status"
            placeholder="Any status"
            options={STATUS_OPTIONS}
            selected={selectedStatuses}
            onChange={onStatusesChange}
          />
          {showDeletedToggle && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-foreground">Deleted</Label>
              <label className="flex h-9 min-w-max cursor-pointer items-center justify-between gap-4 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent/40">
                <span className="text-muted-foreground whitespace-nowrap">Show deleted</span>
                <Switch
                  checked={showDeleted}
                  onCheckedChange={(checked) => onShowDeletedChange?.(checked)}
                />
              </label>
            </div>
          )}
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