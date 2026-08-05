import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";

export interface FacetOption {
  id: number;
  label: string;
}

/**
 * Height cap for a facet's option list — the reason the panel's size is a
 * function of the *layout*, not of how many rows the API returns. Categories
 * are seeded data and grow over time; without a cap an expanded facet pushes
 * the panel past the viewport and drags the whole page's scroll with it.
 *
 * A cap (`max-height`) rather than a fixed height: Difficulty has three options
 * and should not reserve six rows of dead space. Long facets get a scrollbar,
 * short ones hug their content, and neither can change the panel's footprint.
 *
 * `min(rem, dvh)` so the cap also shrinks on short viewports (landscape phones,
 * ~700px laptops) where a rem-only value would still overflow. dvh, not vh, per
 * docs/RESPONSIVE.md — with the plain-rem first line as the older-browser
 * fallback, since an unsupported unit inside `min()` invalidates the whole
 * declaration and would silently restore the uncapped behaviour.
 */
export const FACET_LIST_MAX_HEIGHT =
  "max-h-60 supports-[height:100dvh]:max-h-[min(15rem,38dvh)]";

/** Tighter cap for side-by-side layouts (the multiplayer dialog's 3-up grid). */
export const FACET_LIST_MAX_HEIGHT_COMPACT =
  "max-h-36 supports-[height:100dvh]:max-h-[min(9rem,26dvh)]";

interface FacetSectionProps {
  title: string;
  options: FacetOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  /** Sections start open by default; pass false for tight layouts. */
  defaultOpen?: boolean;
  /** The in-facet search box appears once the list grows beyond this many options. */
  searchThreshold?: number;
  /**
   * Tailwind max-height class(es) for the scrollable option list. Defaults to
   * `FACET_LIST_MAX_HEIGHT`; pass a tighter cap for dense layouts. Never pass
   * an empty string — that uncaps the list (see the constant's note).
   */
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
  listMaxHeight = FACET_LIST_MAX_HEIGHT,
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
                // text-base below sm: a raw <input> imports none of the shared
                // field styling, and anything under 16px makes iOS Safari zoom
                // the page on focus and never zoom back (docs/RESPONSIVE.md).
                className="w-full border-b border-border bg-transparent py-1.5 pl-6 pr-1 text-base sm:text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* The scroll region. overscroll-contain: this list sits inside the
              panel's own scroll area (and, on mobile, inside the drawer), so
              without it a flick past the last category chains into the parent
              and moves the page the user was reading. role=group + label so the
              checkboxes announce as one named set. */}
          <div
            role="group"
            aria-label={title}
            className={cn(
              "space-y-0.5 overflow-y-auto overscroll-contain scrollbar-thin pr-1",
              listMaxHeight
            )}
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
