/** Displays a list of user-saved filter sets that can be applied or deleted. */

import { Button } from "@/components/ui/button";
import { Bookmark, X } from "lucide-react";
import { SavedFilter } from "./types";

interface SavedFiltersListProps {
  savedFilters: SavedFilter[];
  onApply: (filter: SavedFilter) => void;
  onDelete: (filterId: string) => void;
}

export const SavedFiltersList = ({
  savedFilters,
  onApply,
  onDelete,
}: SavedFiltersListProps) => {
  if (savedFilters.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Bookmark className="w-4 h-4" />
        Saved Filters
      </h4>
      <div className="flex flex-wrap gap-2">
        {savedFilters.map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-1 bg-muted/50 rounded-lg pl-3 pr-1 py-1"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApply(filter)}
              className="h-auto p-1 font-normal text-sm hover:bg-transparent"
            >
              {filter.name}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(filter.id)}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
