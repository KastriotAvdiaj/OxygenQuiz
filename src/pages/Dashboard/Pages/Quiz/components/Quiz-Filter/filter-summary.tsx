/** Displays a summary of the current filter results and a "Clear All" button. */

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";

interface FilterSummaryProps {
  totalResults: number;
  totalActiveFilters: number;
  onClearAll: () => void;
}

export const FilterSummary = ({
  totalResults,
  totalActiveFilters,
  onClearAll,
}: FilterSummaryProps) => {
  const filterSummaryText = useMemo(() => {
    if (totalActiveFilters === 0) {
      return `Showing all ${totalResults.toLocaleString()} quizzes`;
    }
    return `${totalResults.toLocaleString()} results with ${totalActiveFilters} filter${
      totalActiveFilters !== 1 ? "s" : ""
    }`;
  }, [totalActiveFilters, totalResults]);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{filterSummaryText}</span>
      {totalActiveFilters > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 px-3 text-muted-foreground hover:text-destructive"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
};
