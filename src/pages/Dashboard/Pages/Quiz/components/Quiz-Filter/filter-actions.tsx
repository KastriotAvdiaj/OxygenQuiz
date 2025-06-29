/** Renders the primary action buttons, including "Save Filter" and the "Filters" toggle with popover. */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// import { Input } from "@/components/ui/form";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { ReactNode } from "react";

interface FilterActionsProps {
  totalActiveFilters: number;
  showFiltersPopover: boolean;
  onToggleFilters: () => void;
  children: ReactNode; // This will be the FilterPanel component
  //   onSave: (name: string) => void;
}

export const FilterActions = ({
  totalActiveFilters,
  showFiltersPopover,
  onToggleFilters,
  children,
}: //   onSave,
FilterActionsProps) => {
  //   const [showSaveDialog, setShowSaveDialog] = useState(false);
  //   const [savedFilterName, setSavedFilterName] = useState("");

  //   const handleSave = () => {
  //     if (!savedFilterName.trim()) return;
  //     onSave(savedFilterName);
  //     setSavedFilterName("");
  //     setShowSaveDialog(false);
  //   };

  return (
    <div className="flex items-center gap-3">
      {/* {totalActiveFilters > 0 && (
        <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="w-4 h-4" />
              Save Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Save Current Filter</h4>
              <Input
                placeholder="Filter name..."
                value={savedFilterName}
                onChange={(e) => setSavedFilterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!savedFilterName.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )} */}

      <Popover open={showFiltersPopover} onOpenChange={onToggleFilters}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 relative rounded-md ${
              showFiltersPopover || totalActiveFilters > 0
                ? "border-primary text-primary bg-primary/20"
                : "bg-background text-foreground"
            } `}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {totalActiveFilters > 0 && (
              <Badge
                className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-white border-foreground/20"
                title="Active Filters"
              >
                {totalActiveFilters}
              </Badge>
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showFiltersPopover ? "rotate-180" : ""
              }`}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-6 dark:border-foreground/30 dark:bg-muted"
          align="end"
          side="bottom"
          sideOffset={8}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Advanced Filters</h3>
          </div>
          {children}
        </PopoverContent>
      </Popover>
    </div>
  );
};
