import { AlertTriangle, Sparkles } from "lucide-react";

import { Spinner } from "@/components/ui";
import { cn } from "@/utils/cn";

import {
  useProposeCategoryPalette,
  type PaletteCandidate,
} from "../api/propose-category-palette";

export interface PaletteSuggestionsProps {
  /** Whatever is currently typed in the name field — the only thing the AI is given. */
  categoryName: string;
  /** Applies a candidate to the picker above. The admin can still edit it afterwards. */
  onApply: (colors: string[]) => void;
}

const Swatch = ({ candidate }: { candidate: PaletteCandidate }) => (
  <span className="flex overflow-hidden rounded-md border border-border">
    {candidate.colors.map((color) => (
      // Inline style, not a Tailwind class: these are arbitrary runtime hex values, and the
      // JIT compiler only generates classes it can read verbatim in source (CLAUDE.md).
      <span key={color} className="h-6 w-6" style={{ backgroundColor: color }} />
    ))}
  </span>
);

/**
 * "Suggest colours" plus the three candidates it returns.
 *
 * <b>Nothing here saves.</b> Applying a candidate fills the picker above; the admin still
 * presses the form's own submit. See docs/adr/0003-the-model-proposes-the-code-decides.md.
 *
 * <b>Clashes are shown, not hidden.</b> A candidate too close to an existing category is
 * labelled with that category's name rather than dropped — the admin is the one choosing, and
 * a candidate silently disappearing would leave them with fewer options for no visible reason.
 * Collisions are acceptable eventually; being surprised by one is not.
 */
export const PaletteSuggestions = ({
  categoryName,
  onApply,
}: PaletteSuggestionsProps) => {
  const propose = useProposeCategoryPalette();
  const trimmedName = categoryName.trim();

  return (
    <section aria-label="Suggested palettes" className="space-y-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Not sure what colours to use?</p>

        {/* Stays enabled with an empty name and explains itself on press, like the AI wizard's
            Generate button — a disabled control says you can't proceed but never why. */}
        <button
          type="button"
          onClick={() => trimmedName && propose.mutate(trimmedName)}
          disabled={propose.isPending}
          title={trimmedName ? undefined : "Type a category name first"}
          className={cn(
            "inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 py-1.5",
            "text-sm transition-colors hover:border-primary hover:bg-primary/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          {propose.isPending ? (
            <>
              <Spinner size="sm" /> Thinking…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Suggest colours
            </>
          )}
        </button>
      </div>

      {!trimmedName && (
        <p className="text-xs text-muted-foreground">
          Type the category name first — it's the only thing the AI gets to work from.
        </p>
      )}

      {propose.isError && (
        <p role="alert" className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Couldn't get suggestions. Pick colours by hand, or try again.
        </p>
      )}

      {propose.data && (
        <ul className="space-y-1.5">
          {propose.data.candidates.map((candidate) => (
            <li key={candidate.colors.join()}>
              <button
                type="button"
                onClick={() => onApply(candidate.colors)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg border-2 border-border px-3 py-2 text-left",
                  "transition-colors hover:border-primary hover:bg-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <Swatch candidate={candidate} />
                <span className="min-w-0 text-xs text-muted-foreground">
                  {candidate.clashesWith
                    ? `Close to "${candidate.clashesWith}" — usable, but harder to tell apart.`
                    : "Use these"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
