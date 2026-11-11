import { Button, Card } from "@/components/ui";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  ActiveFilterPills,
  type ActiveFilterPill,
} from "@/components/ui/active-filter-pills";
import { Filter, X } from "lucide-react";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { SearchInput } from "@/lib/Search-Input";

interface QuestionFiltersProps {
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

  createdFrom: string;
  createdTo: string;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;
}

export const QuestionFilters = ({
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
  createdFrom,
  createdTo,
  onCreatedFromChange,
  onCreatedToChange,
}: QuestionFiltersProps) => {
  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedCategoryIds.length > 0 ||
    selectedDifficultyIds.length > 0 ||
    selectedLanguageIds.length > 0 ||
    Boolean(createdFrom) ||
    Boolean(createdTo);

  const resetFilters = () => {
    onSearchTermChange("");
    onCategoryIdsChange([]);
    onDifficultyIdsChange([]);
    onLanguageIdsChange([]);
    onCreatedFromChange("");
    onCreatedToChange("");
  };

  // One removable pill per applied filter. Search keeps its own box + clear.
  const buildIdPills = (
    prefix: string,
    selectedIds: number[],
    options: { id: number; name: string }[],
    onChange: (ids: number[]) => void
  ): ActiveFilterPill[] =>
    selectedIds.map((id) => ({
      id: `${prefix}-${id}`,
      label: options.find((o) => o.id === id)?.name ?? `#${id}`,
      onRemove: () => onChange(selectedIds.filter((x) => x !== id)),
    }));

  const pills: ActiveFilterPill[] = [
    ...buildIdPills("category", selectedCategoryIds,
      categories.map((c) => ({ id: c.id, name: `Category: ${c.name}` })), onCategoryIdsChange),
    ...buildIdPills("difficulty", selectedDifficultyIds,
      difficulties.map((d) => ({ id: d.id, name: `Difficulty: ${d.level}` })), onDifficultyIdsChange),
    ...buildIdPills("language", selectedLanguageIds,
      languages.map((l) => ({ id: l.id, name: `Language: ${l.language}` })), onLanguageIdsChange),
  ];

  if (createdFrom)
    pills.push({ id: "from", label: `From: ${createdFrom}`, onRemove: () => onCreatedFromChange("") });
  if (createdTo)
    pills.push({ id: "to", label: `To: ${createdTo}`, onRemove: () => onCreatedToChange("") });

  const activeCount =
    selectedCategoryIds.length +
    selectedDifficultyIds.length +
    selectedLanguageIds.length +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0);

  return (
    <Card className="flex flex-col gap-4 p-4 bg-card border dark:border-foreground/30 shadow-sm">
      <div className="border-b pb-4 dark:border-foreground/10">
         <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          Search
        </h2>
        <SearchInput
          placeholder="Search questions..."
          onSearch={onSearchTermChange}
          initialValue={searchTerm}
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
              // Resetting a view isn't destructive: a quiet text button, not a red one.
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground animate-in fade-in-0 duration-200 motion-reduce:animate-none">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </Button>
          )}
        </div>

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
