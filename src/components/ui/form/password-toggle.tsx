import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/utils/cn";

export interface PasswordToggleProps {
  /** Whether the password is currently shown as text. */
  visible: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * The eye button inside a password field: shows what was typed, and hides it again. Sits over
 * the field's right edge, so the field leaves room for it (`pr-10`, or `.minimal-input--has-toggle`
 * in global.css for the minimal variant). Used by the shared `Input` for every `type="password"`,
 * and by the reset-password page's plain inputs.
 *
 * A real `<button type="button">` — reachable by keyboard and announced as a toggle — so it never
 * submits the form it sits in. The icon swap fades rather than snapping (docs/development/motion.md).
 */
export const PasswordToggle = ({ visible, onToggle, className }: PasswordToggleProps) => {
  const Icon = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      className={cn(
        "absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      <Icon
        key={visible ? "hide" : "show"}
        className="h-4 w-4 animate-in fade-in zoom-in-90 duration-150 motion-reduce:animate-none"
        aria-hidden="true"
      />
    </button>
  );
};
