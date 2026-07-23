import { useMemo } from "react";
import { X } from "lucide-react";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { cn } from "@/utils/cn";
import { FacetSection, type FacetOption } from "./facet-section";
import type { QuizFacetKey, QuizFilterSelections } from "./use-quiz-filter-state";

interface QuizFilterPanelProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  selections: QuizFilterSelections;
  onToggle: (facet: QuizFacetKey, id: number) => void;
  onClearAll: () => void;
  activeCount: number;
  /**
   * "sidebar" (default) — standalone card for the /choose-quiz left column and
   * the mobile drawer. "compact" — frameless, tighter spacing, facets closed by
   * default and side-by-side where width allows; for the multiplayer dialog.
   */
  variant?: "sidebar" | "compact";
  /**
   * When true (desktop sidebar), the panel fills its parent's height and scrolls
   * its facet list internally — the header stays pinned and the panel never grows
   * past the viewport. Left false for the mobile drawer / compact dialog, which
   * scroll as a whole.
   */
  fillHeight?: boolean;
  className?: string;
}

/**
 * The faceted quiz filter panel: one collapsible checkbox section per facet
 * (category / difficulty / language), each searchable when long, with selected
 * options pinned on top. Selections are OR within a facet, AND across facets
 * (each facet serializes to one `in` rule).
 */
export function QuizFilterPanel({
  categories,
  difficulties,
  languages,
  selections,
  onToggle,
  onClearAll,
  activeCount,
  variant = "sidebar",
  fillHeight = false,
  className,
}: QuizFilterPanelProps) {
  const categoryOptions = useMemo<FacetOption[]>(
    () => categories.map((c) => ({ id: c.id, label: c.name })),
    [categories]
  );
  const difficultyOptions = useMemo<FacetOption[]>(
    () => difficulties.map((d) => ({ id: d.id, label: d.level })),
    [difficulties]
  );
  const languageOptions = useMemo<FacetOption[]>(
    () => languages.map((l) => ({ id: l.id, label: l.language })),
    [languages]
  );

  const compact = variant === "compact";

  const facets: {
    key: QuizFacetKey;
    title: string;
    options: FacetOption[];
  }[] = [
    { key: "categoryIds", title: "Category", options: categoryOptions },
    { key: "difficultyIds", title: "Difficulty", options: difficultyOptions },
    { key: "languageIds", title: "Language", options: languageOptions },
  ];

  return (
    <div
      className={cn(
        // Adapts to the viewport: full width inside the mobile drawer, natural
        // width in the desktop sidebar column. Soft translucent surface so it
        // reads as a distinct panel without fighting the page background.
        !compact &&
          "w-full rounded-xl border border-border bg-card/50 p-5 shadow-sm backdrop-blur-sm lg:w-auto sm:p-6 font-app",
        // Sidebar: hugs its content when short (collapsed), but never grows past
        // the viewport — it caps at the page height and scrolls its body
        // internally, so it can't spill onto the footer.
        // dvh, not vh: cap against the *visible* viewport (mobile browser chrome
        // makes 100vh over-measure); the vh class is the older-browser fallback.
        !compact && fillHeight &&
          "flex max-h-[calc(100vh-7rem)] supports-[height:100dvh]:max-h-[calc(100dvh-7rem)] flex-col overflow-hidden",
        className
      )}
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Filters
        </h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div
        className={cn(
          compact
            ? "sm:grid sm:grid-cols-3 sm:gap-x-6 divide-y divide-border/60 sm:divide-y-0"
            : "divide-y divide-border/60",
          // In the full-height sidebar the whole facet column scrolls as one
          // (single scrollbar), so individual facet lists aren't capped.
          !compact && fillHeight && "-mr-2 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin"
        )}
      >
        {facets.map((facet) => (
          <FacetSection
            key={facet.key}
            title={facet.title}
            options={facet.options}
            selectedIds={selections[facet.key]}
            onToggle={(id) => onToggle(facet.key, id)}
            // Collapsed by default — the panel opens tidy and the user expands
            // only the facet they want.
            defaultOpen={false}
            listMaxHeight={compact ? "max-h-36" : fillHeight ? "" : "max-h-52"}
          />
        ))}
      </div>
    </div>
  );
}
