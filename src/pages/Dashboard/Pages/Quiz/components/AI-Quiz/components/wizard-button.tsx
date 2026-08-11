import { LiftedButton, type LiftedButtonProps } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";

/**
 * `LiftedButton` at the wizard's size.
 *
 * The default face is `py-2 px-4` at inherited 16px text — about 40px tall, which reads as a
 * page-level primary action. In this panel the buttons sit among labels and helper text, so
 * they want to be quieter than that.
 *
 * <b>Responsive on purpose.</b> The compact height only applies from `sm` up: 14px text with
 * `py-1.5` is a 32px control, and docs/RESPONSIVE.md asks for ≥36px on anything you tap. So
 * phones keep `py-2` (36px) and pointer devices get the smaller face.
 *
 * A component rather than a copy-pasted class string because the wizard's buttons live in
 * two files — the sizing is one decision and should have one home.
 */
export const WizardButton = ({ className, ...props }: LiftedButtonProps) => (
  <LiftedButton
    {...props}
    className={cn("px-3 py-2 text-sm sm:py-1.5", className)}
  />
);
