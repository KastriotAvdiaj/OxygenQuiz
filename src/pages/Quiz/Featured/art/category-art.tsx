import type { ComponentType } from "react";
import { cn } from "@/utils/cn";
import { GeneralKnowledgeArt } from "./general-knowledge-art";
import { GeographyArt } from "./geography-art";
import { HistoryArt } from "./history-art";
import { ScienceArt } from "./science-art";
import { ART_H, ART_W } from "./strokes";

/**
 * Each category's drawing, by panel slug. `quiet` drawings cover the whole card — title included —
 * so they are drawn fainter.
 */
const ART: Record<string, { Drawing: ComponentType; quiet?: boolean }> = {
  geography: { Drawing: GeographyArt },
  "general-knowledge": { Drawing: GeneralKnowledgeArt, quiet: true },
  science: { Drawing: ScienceArt },
  history: { Drawing: HistoryArt },
};

/**
 * The line drawing behind a category panel (docs/quiz/featured-quizzes.md, "The drawings"), in
 * the landing page globe's style, white on the category's colour. It fills the card: cropped, not
 * squashed, and anchored bottom right, so on a narrow phone card the right-hand subject stays.
 */
export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  const art = ART[slug];
  if (!art) return null;
  const { Drawing, quiet } = art;
  return (
    <svg
      viewBox={`0 0 ${ART_W} ${ART_H}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      className={cn(
        "pointer-events-none select-none text-white",
        quiet ? "opacity-60" : "opacity-90",
        className,
      )}
    >
      <Drawing />
    </svg>
  );
}
