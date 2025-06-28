/** Renders the primary action buttons, including "Save Filter" and the "Filters" toggle. */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/form";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

interface FilterActionsProps {
  totalActiveFilters: number;
  showAdvancedFilters: boolean;
  onToggleAdvanced: () => void;
  onSave: (name: string) => void;
}

export const FilterActions = ({
  totalActiveFilters,
  showAdvancedFilters,
  onToggleAdvanced,
//   onSave,
}: FilterActionsProps) => {
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

      <Button
        variant={
          showAdvancedFilters || totalActiveFilters > 0 ? "default" : "outline"
        }
        onClick={onToggleAdvanced}
        className="gap-2 relative"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {totalActiveFilters > 0 && (
          <Badge
            variant="secondary"
            className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary border-primary/20"
          >
            {totalActiveFilters}
          </Badge>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            showAdvancedFilters ? "rotate-180" : ""
          }`}
        />
      </Button>
    </div>
  );
};
