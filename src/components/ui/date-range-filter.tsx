import { Label } from "@/components/ui/form";
import { cn } from "@/utils/cn";

interface DateRangeFilterProps {
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  from: string; // ISO date (yyyy-mm-dd) or ""
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}

// Inputs styled to match the "form" Select variant so the date range reads as part of the
// same dropdown family rather than raw browser controls.
const inputClass =
  "h-8 w-full min-w-0 rounded-md border-2 border-foreground/20 bg-background px-2 py-1 text-xs font-medium " +
  "text-foreground shadow-inner shadow-foreground/5 transition-all duration-200 hover:border-foreground/40 " +
  "focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "dark:border-foreground/30 dark:shadow-foreground/10 dark:hover:border-foreground/50";

export const DateRangeFilter = ({
  label,
  fromLabel = "From",
  toLabel = "To",
  from,
  to,
  onFromChange,
  onToChange,
  className,
}: DateRangeFilterProps) => {
  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {label && (
        <Label className="text-xs font-medium text-foreground">{label}</Label>
      )}
      <div className="flex items-end gap-2">
        <div className="flex flex-1 min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">{fromLabel}</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-1 min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">{toLabel}</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onToChange(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
};
