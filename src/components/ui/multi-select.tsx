import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/form";
import { cn } from "@/utils/cn";

// Values may be numeric ids (categories) or string ids/enums (visibility, user ids).
export type MultiSelectValue = string | number;

export type MultiSelectOption<TValue extends MultiSelectValue = number> = {
  label: string;
  value: TValue;
};

interface MultiSelectProps<TValue extends MultiSelectValue> {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption<TValue>[];
  selected: TValue[];
  onChange: (values: TValue[]) => void;
  /** Show a filter box at the top of the list — useful for long lists (e.g. users). */
  searchable?: boolean;
  className?: string;
  /**
   * Set when this MultiSelect is used inside a modal Dialog. The options list is
   * then rendered in-place instead of portalled to <body>, so the dialog's
   * `pointer-events: none` lock doesn't swallow clicks on the options.
   */
  withinDialog?: boolean;
}

// Trigger styled to match the "form" Select variant (see components/ui/select.tsx) so it sits
// naturally next to the quiz-style dropdowns. Shows the picked options as removable chips.
const triggerClass =
  "flex min-h-8 w-full items-center justify-between gap-2 rounded-md border-2 border-foreground/20 " +
  "bg-background px-2 py-1 text-xs font-medium shadow-inner shadow-foreground/5 transition-all " +
  "duration-200 hover:border-foreground/40 focus:border-primary/60 focus:outline-none focus:ring-2 " +
  "focus:ring-primary/20 dark:border-foreground/30 dark:shadow-foreground/10 dark:hover:border-foreground/50";

export function MultiSelect<TValue extends MultiSelectValue = number>({
  label,
  placeholder = "All",
  options,
  selected,
  onChange,
  searchable = false,
  className,
  withinDialog = false,
}: MultiSelectProps<TValue>) {
  const [query, setQuery] = React.useState("");

  const toggle = (value: TValue) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  const visibleOptions = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <Label className="text-xs font-medium text-foreground">{label}</Label>
      )}

      <Popover>
        <PopoverTrigger className={triggerClass}>
          <span className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {selectedOptions.length === 0 ? (
              <span className="text-foreground/60 font-normal">{placeholder}</span>
            ) : (
              selectedOptions.map((o) => (
                <Badge
                  key={String(o.value)}
                  variant="outline"
                  className="gap-1 border-primary/40 bg-primary/10 text-foreground"
                  // Remove a chip without opening the popover.
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(o.value);
                  }}>
                  {o.label}
                  <X className="h-3 w-3 opacity-70" />
                </Badge>
              ))
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-foreground/60" />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          portalled={!withinDialog}
          className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-1 dark:border-foreground/30">
          {searchable && (
            <div className="relative mb-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-md border border-foreground/20 bg-background py-1 pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none"
              />
            </div>
          )}

          <ul className="max-h-60 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <li className="px-2 py-1 text-xs text-muted-foreground">No matches</li>
            ) : (
              visibleOptions.map((o) => {
                const isSelected = selected.includes(o.value);
                return (
                  <li key={String(o.value)}>
                    <button
                      type="button"
                      onClick={() => toggle(o.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                        "hover:bg-foreground/5",
                        isSelected && "bg-primary/10 font-medium"
                      )}>
                      {o.label}
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Clear selection
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
