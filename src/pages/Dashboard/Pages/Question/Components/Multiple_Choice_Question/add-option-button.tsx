import { Plus } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";

/**
 * "Add answer option" in the multiple-choice create and update forms. Secondary (muted): the
 * form's primary action is saving it. Disabled at the four-option maximum.
 */
export const AddOptionButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
  <LiftedButton
    type="button"
    size="sm"
    className="flex items-center gap-2 bg-muted text-foreground"
    liftColor="muted-foreground"
    onClick={onClick}
    disabled={disabled}
  >
    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
    Add answer option
  </LiftedButton>
);
