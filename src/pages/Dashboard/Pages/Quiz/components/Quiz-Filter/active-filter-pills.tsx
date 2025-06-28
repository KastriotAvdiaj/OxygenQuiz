/** Renders "pills" or "badges" for each currently active filter, allowing removal. */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { ActiveFilter } from "./types";

interface ActiveFilterPillsProps {
  searchTerm: string;
  activeFilters: ActiveFilter[];
  onRemoveFilter: (filterKey: string) => void;
}

export const ActiveFilterPills = ({
  searchTerm,
  activeFilters,
  onRemoveFilter,
}: ActiveFilterPillsProps) => {
  const hasSearchTerm = searchTerm.trim().length > 0;
  if (activeFilters.length === 0 && !hasSearchTerm) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Active Filters</h4>
      <div className="flex flex-wrap gap-2">
        {hasSearchTerm && (
          <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
            <Search className="w-3 h-3" />
            <span>"{searchTerm}"</span>
            <Button variant="ghost" size="sm" onClick={() => onRemoveFilter("search")} className="h-auto p-0 hover:bg-transparent hover:text-destructive ml-1">
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        )}
        {activeFilters.map((filter) => (
          <Badge key={filter.key} variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary transition-colors">
            <span className="font-medium">{filter.label}</span>
            <Button variant="ghost" size="sm" onClick={() => onRemoveFilter(filter.key)} className="h-auto p-0 hover:bg-transparent hover:text-destructive ml-1">
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
};