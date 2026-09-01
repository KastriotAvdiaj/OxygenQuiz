import { AlertTriangle, Sparkles } from "lucide-react";

import { Spinner } from "@/components/ui";
import { cn } from "@/utils/cn";

import {
  paletteErrorMessage,
  usePaletteAvailability,
  useProposeCategoryPalette,
  type PaletteCandidate,
} from "../api/propose-category-palette";

export interface PaletteSuggestionsProps {
  /** Whatever is currently typed in the name field — the only thing the AI is given. */
  categoryName: string;
  /** Applies a candidate to the picker around it. The admin can still edit it afterwards. */
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
 * Rendered inside `color-palette-input.tsx`, directly above the swatch rows it writes to, so
 * both category forms get it from the picker rather than each wiring it up themselves.
 *
 * <b>Nothing here saves.</b> Applying a candidate fills the swatch rows below; the admin still
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
  const availability = usePaletteAvailability();
  const trimmedName = categoryName.trim();

  /**
   * Why the button can't be pressed, or undefined when it can. One value rather than two booleans
   * because the tooltip and the disabled state must never disagree — the reason IS the condition.
   *
   * Availability is checked before the name, because "there is no AI on this server" is not
   * fixable by typing and telling the admin to type first would be a lie. `undefined` data means
   * the check hasn't answered (or failed, which it is allowed to do silently): unknown counts as
   * available, so a network blip degrades to a button that fails informatively rather than one
   * greyed out for no stated reason.
   */
  const disabledReason = availability.data?.available === false
    ? availability.data.reason ?? "AI features are unavailable right now."
    : !trimmedName
      ? "Type a category name first"
      : undefined;

  const blocked = disabledReason !== undefined || propose.isPending;

  return (
    <section aria-label="Suggested palettes" className="space-y-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Not sure what colours to use?</p>

        {/* `aria-disabled`, deliberately, NOT the `disabled` attribute — please don't "fix"
            this back. A truly disabled button emits no mouse events, so the `title` tooltip
            never appears: the admin gets a greyed-out control that cannot say why it is
            greyed out, on the one screen where the reason ("type a name") is the whole
            instruction. This stays focusable and hoverable so the tooltip fires, reads as
            disabled to assistive tech, looks muted, and no-ops the click instead. */}
        <button
          type="button"
          onClick={() => {
            if (blocked) return;
            propose.mutate(trimmedName);
          }}
          aria-disabled={blocked}
          title={disabledReason}
          className={cn(
            "inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 py-1.5",
            "text-sm transition-colors hover:border-primary hover:bg-primary/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
            "aria-disabled:hover:border-border aria-disabled:hover:bg-transparent"
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

      {/* `w-0 min-w-full` — the width of this form must not depend on how long the server's
          sentence is. `DrawerContent side="right"` is `w-fit`, so the panel takes its width
          from its widest content, and an unwrapped error line stretched the whole drawer
          sideways: it jumped wider when the error appeared and back when it cleared. Zero
          intrinsic width keeps this line out of that measurement, and `min-w-full` then paints
          it across whatever width the rest of the form settled on, where it wraps.

          The same treatment is on the candidate list below, for the same reason — the clash
          note carries a category name, so its length is data too. The short, fixed header row
          above is what the section is allowed to be as wide as. */}
      {propose.isError && (
        <p
          role="alert"
          className="flex w-0 min-w-full items-start gap-1 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0">{paletteErrorMessage(propose.error)}</span>
        </p>
      )}

      {propose.data && (
        <ul className="w-0 min-w-full space-y-1.5">
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
