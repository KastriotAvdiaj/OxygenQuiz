import { X } from "lucide-react";
import { cn } from "@/utils/cn";

export type ActiveFilterPill = {
  id: string;
  label: string;
  onRemove: () => void;
};

interface ActiveFilterPillsProps {
  pills: ActiveFilterPill[];
  onClearAll?: () => void;
  className?: string;
}

/**
 * A row of removable pills summarising the currently-applied filters. Each pill removes
 * just its own filter; "Clear all" (shown when there's more than one) removes them together.
 * Renders nothing when there are no active filters.
 */
export const ActiveFilterPills = ({
  pills,
  onClearAll,
  className,
}: ActiveFilterPillsProps) => {
  if (pills.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {pills.map((pill) => (
        <span
          key={pill.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground">
          {pill.label}
          <button
            type="button"
            onClick={pill.onRemove}
            aria-label={`Remove ${pill.label}`}
            className="rounded-full p-0.5 text-foreground/60 transition-colors hover:bg-primary/20 hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {onClearAll && pills.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Clear all
        </button>
      )}
    </div>
  );
};
