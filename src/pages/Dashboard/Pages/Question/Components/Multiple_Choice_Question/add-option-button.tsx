import { Plus } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";

/**
 * "Add answer option" in the multiple-choice create and update forms: primary blue, compact
 * (`text-sm py-1`) so it doesn't outweigh the options above it. Disabled at the four-option maximum.
 */
export const AddOptionButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
  <LiftedButton
    type="button"
    className="flex items-center gap-2 py-1 text-sm"
    onClick={onClick}
    disabled={disabled}
  >
    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
    Add answer option
  </LiftedButton>
);
