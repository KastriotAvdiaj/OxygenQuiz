import { forwardRef } from "react";

import { LiftedButton, type LiftedButtonProps } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";

/**
 * `LiftedButton` at the wizard's size.
 *
 * The default face is `py-2 px-4` at inherited 16px text — about 40px tall, which reads as a
 * page-level primary action. In this panel the buttons sit among labels and helper text, so
 * they want to be quieter than that.
 *
 * <b>The sizing now lives on `LiftedButton` as `size="sm"`</b>, not in a class string here.
 * The quiz page's action row needed the same compact face, and copying the numbers to a second
 * file is exactly what this component's own "one decision, one home" note was against. The
 * responsive rule travels with it: the tighter face applies from `sm:` up only, because 14px
 * text with `py-1.5` computes to 32px and docs/RESPONSIVE.md asks ≥36px for anything tappable.
 *
 * This component still exists because the wizard's buttons live in two files and share more
 * than a size — it is the wizard's button, and `size="sm"` is only how it is currently built.
 *
 * <b>Forwards its ref</b> so Radix `asChild` triggers (`DrawerTrigger`, `DrawerClose`) can
 * render it. Without that they warn and quietly drop the composition, which is how you end
 * up hand-wiring `onClick={() => setOpen(false)}` next to a primitive that already does it.
 */
export const WizardButton = forwardRef<HTMLButtonElement, LiftedButtonProps>(
  ({ className, ...props }, ref) => (
    <LiftedButton ref={ref} size="sm" {...props} className={cn(className)} />
  )
);
WizardButton.displayName = "WizardButton";
