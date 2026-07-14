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
        !compact &&
          "rounded-xl border-2 border-border bg-background p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-1 flex items-center justify-between">
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
            : "divide-y divide-border/60"
        )}
      >
        {facets.map((facet) => (
          <FacetSection
            key={facet.key}
            title={facet.title}
            options={facet.options}
            selectedIds={selections[facet.key]}
            onToggle={(id) => onToggle(facet.key, id)}
            defaultOpen={!compact}
            listMaxHeight={compact ? "max-h-36" : "max-h-52"}
          />
        ))}
      </div>
    </div>
  );
}
