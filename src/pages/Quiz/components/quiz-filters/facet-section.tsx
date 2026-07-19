import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";

export interface FacetOption {
  id: number;
  label: string;
}

interface FacetSectionProps {
  title: string;
  options: FacetOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  /** Sections start open by default; pass false for tight layouts. */
  defaultOpen?: boolean;
  /** The in-facet search box appears once the list grows beyond this many options. */
  searchThreshold?: number;
  /** Tailwind max-height class for the scrollable option list. */
  listMaxHeight?: string;
}

/**
 * One collapsible filter group (e.g. "Category"): a checkbox per option,
 * selected options pinned to the top, and — for long lists — a search box
 * that narrows the unselected remainder. Pinned selections are exempt from
 * the search filter so an active choice never disappears mid-interaction.
 */
export function FacetSection({
  title,
  options,
  selectedIds,
  onToggle,
  defaultOpen = true,
  searchThreshold = 8,
  listMaxHeight = "max-h-52",
}: FacetSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");

  const searchable = options.length > searchThreshold;

  const { pinned, rest } = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const normalized = query.trim().toLocaleLowerCase();
    return {
      pinned: options.filter((o) => selectedSet.has(o.id)),
      rest: options.filter(
        (o) =>
          !selectedSet.has(o.id) &&
          (!normalized || o.label.toLocaleLowerCase().includes(normalized))
      ),
    };
  }, [options, selectedIds, query]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          {title}
          {selectedIds.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular-nums">
              {selectedIds.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Smooth height/opacity reveal. AnimatePresence + height:auto gives a
          clean open/close without the layout jump a display toggle would cause;
          overflow-hidden clips the content mid-animation. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3">
          {searchable && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="text"
                role="searchbox"
                aria-label={`Search ${title.toLocaleLowerCase()}`}
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border-b border-border bg-transparent py-1.5 pl-6 pr-1 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          )}

          <div
            className={cn("space-y-0.5 overflow-y-auto scrollbar-thin pr-1", listMaxHeight)}
          >
            {pinned.map((option) => (
              <FacetRow
                key={option.id}
                facetTitle={title}
                option={option}
                checked
                onToggle={onToggle}
              />
            ))}
            {pinned.length > 0 && rest.length > 0 && (
              <div className="my-1 h-px bg-border/60" role="separator" />
            )}
            {rest.map((option) => (
              <FacetRow
                key={option.id}
                facetTitle={title}
                option={option}
                checked={false}
                onToggle={onToggle}
              />
            ))}
            {pinned.length === 0 && rest.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">
                {query ? "No matches" : "No options"}
              </p>
            )}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FacetRowProps {
  facetTitle: string;
  option: FacetOption;
  checked: boolean;
  onToggle: (id: number) => void;
}

function FacetRow({ facetTitle, option, checked, onToggle }: FacetRowProps) {
  const inputId = `facet-${facetTitle}-${option.id}`;
  return (
    <div className="flex items-center gap-3 rounded-md px-1.5 py-2 hover:bg-muted/60 transition-colors">
      <Checkbox
        id={inputId}
        checked={checked}
        onCheckedChange={() => onToggle(option.id)}
        className="h-[18px] w-[18px] rounded-[5px] border-2"
      />
      <label
        htmlFor={inputId}
        className={cn(
          "flex-1 cursor-pointer select-none truncate text-sm",
          checked ? "font-medium text-foreground" : "text-foreground/80"
        )}
        title={option.label}
      >
        {option.label}
      </label>
    </div>
  );
}
