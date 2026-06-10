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
import { SearchInput } from "@/lib/Search-Input";

export type CategoryFilterUser = { id: string; username: string };

interface CategoryFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;

  gradient: TriState;
  onGradientChange: (value: TriState) => void;

  // Creator filter (backend: userId Eq/In).
  users: CategoryFilterUser[];
  creatorIds: string[];
  onCreatorIdsChange: (ids: string[]) => void;

  createdFrom: string;
  createdTo: string;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;
}

/**
 * Filter panel for the categories table — same card pattern as the
 * quizzes/questions pages, rendered beside the table.
 */
export const CategoryFilters = ({
  searchTerm,
  onSearchTermChange,
  gradient,
  onGradientChange,
  users,
  creatorIds,
  onCreatorIdsChange,
  createdFrom,
  createdTo,
  onCreatedFromChange,
  onCreatedToChange,
}: CategoryFiltersProps) => {
  const usernameOf = (id: string) =>
    users.find((u) => u.id === id)?.username ?? `${id.slice(0, 8)}…`;

  const activeCount =
    creatorIds.length +
    (gradient !== "any" ? 1 : 0) +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0);

  const hasActiveFilters = Boolean(searchTerm) || activeCount > 0;

  const resetFilters = () => {
    onSearchTermChange("");
    onGradientChange("any");
    onCreatorIdsChange([]);
    onCreatedFromChange("");
    onCreatedToChange("");
  };

  const pills: ActiveFilterPill[] = creatorIds.map((id) => ({
    id: `creator-${id}`,
    label: `Creator: ${usernameOf(id)}`,
    onRemove: () => onCreatorIdsChange(creatorIds.filter((x) => x !== id)),
  }));
  if (gradient !== "any")
    pills.push({
      id: "gradient",
      label: `Gradient: ${gradient === "yes" ? "Yes" : "No"}`,
      onRemove: () => onGradientChange("any"),
    });
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
          placeholder="Search categories..."
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

        <div className="grid grid-cols-1 gap-3">
          <TriStateSelect
            label="Gradient"
            value={gradient}
            onChange={onGradientChange}
            yesLabel="Gradient"
            noLabel="Solid"
          />
          <MultiSelect<string>
            label="Creator"
            placeholder="Any creator"
            searchable
            options={users.map((u) => ({ label: u.username, value: u.id }))}
            selected={creatorIds}
            onChange={onCreatorIdsChange}
          />
          <DateRangeFilter
            label="Created date"
            from={createdFrom}
            to={createdTo}
            onFromChange={onCreatedFromChange}
            onToChange={onCreatedToChange}
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
