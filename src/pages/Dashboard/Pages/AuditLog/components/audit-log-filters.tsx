import { Button, Card } from "@/components/ui";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  ActiveFilterPills,
  type ActiveFilterPill,
} from "@/components/ui/active-filter-pills";
import { Filter } from "lucide-react";
import { RiFilterOffLine } from "react-icons/ri";
import { SearchInput } from "@/lib/Search-Input";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/types/audit-types";

export type AuditLogFilterUser = { id: string; username: string };

interface AuditLogFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;

  actions: string[];
  onActionsChange: (values: string[]) => void;

  entities: string[];
  onEntitiesChange: (values: string[]) => void;

  users: AuditLogFilterUser[];
  actorIds: string[];
  onActorIdsChange: (ids: string[]) => void;

  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

/**
 * Sidebar filter panel for the audit log — same card pattern as the
 * quizzes/questions pages so the dashboard filter UX stays consistent.
 */
export const AuditLogFilters = ({
  searchTerm,
  onSearchTermChange,
  actions,
  onActionsChange,
  entities,
  onEntitiesChange,
  users,
  actorIds,
  onActorIdsChange,
  from,
  to,
  onFromChange,
  onToChange,
}: AuditLogFiltersProps) => {
  const usernameOf = (id: string) =>
    users.find((u) => u.id === id)?.username ?? `${id.slice(0, 8)}…`;

  const activeCount =
    actions.length +
    entities.length +
    actorIds.length +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const hasActiveFilters = Boolean(searchTerm) || activeCount > 0;

  const resetFilters = () => {
    onSearchTermChange("");
    onActionsChange([]);
    onEntitiesChange([]);
    onActorIdsChange([]);
    onFromChange("");
    onToChange("");
  };

  const pills: ActiveFilterPill[] = [
    ...actions.map((a) => ({
      id: `action-${a}`,
      label: `Action: ${a}`,
      onRemove: () => onActionsChange(actions.filter((x) => x !== a)),
    })),
    ...entities.map((e) => ({
      id: `entity-${e}`,
      label: `Entity: ${e}`,
      onRemove: () => onEntitiesChange(entities.filter((x) => x !== e)),
    })),
    ...actorIds.map((id) => ({
      id: `actor-${id}`,
      label: `Actor: ${usernameOf(id)}`,
      onRemove: () => onActorIdsChange(actorIds.filter((x) => x !== id)),
    })),
  ];
  if (from)
    pills.push({ id: "from", label: `From: ${from}`, onRemove: () => onFromChange("") });
  if (to)
    pills.push({ id: "to", label: `To: ${to}`, onRemove: () => onToChange("") });

  return (
    <Card className="flex flex-col gap-4 p-4 bg-card border dark:border-foreground/30 shadow-sm">
      <div className="border-b pb-4 dark:border-foreground/10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          Search
        </h2>
        <SearchInput
          placeholder="Search by action…"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MultiSelect<string>
            label="Action"
            placeholder="All actions"
            searchable
            options={AUDIT_ACTIONS.map((a) => ({ label: a, value: a }))}
            selected={actions}
            onChange={onActionsChange}
          />
          <MultiSelect<string>
            label="Entity"
            placeholder="All entities"
            options={AUDIT_ENTITIES.map((e) => ({ label: e, value: e }))}
            selected={entities}
            onChange={onEntitiesChange}
          />
          <MultiSelect<string>
            label="Actor"
            placeholder="Any actor"
            searchable
            options={users.map((u) => ({ label: u.username, value: u.id }))}
            selected={actorIds}
            onChange={onActorIdsChange}
            className="sm:col-span-2"
          />
          <DateRangeFilter
            label="Date"
            from={from}
            to={to}
            onFromChange={onFromChange}
            onToChange={onToChange}
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
