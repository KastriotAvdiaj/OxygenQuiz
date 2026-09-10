import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";

export interface LeaveGenerationDialogProps {
  isOpen: boolean;
  /** Proceeds with the navigation that was blocked. The generation dies with the page. */
  onConfirm: () => void;
  /** Stays put. Also what Escape and an overlay click do. */
  onCancel: () => void;
}

/**
 * Shown when the user tries to leave while the model is still writing.
 *
 * The card already says "This usually takes 10–30 seconds. Keep this tab open." — a sentence
 * that describes a rule nothing enforced. A generation is not a draft: it is a request in
 * flight against a metered allowance (`QuotaNote`), so leaving mid-call spends the generation
 * and returns nothing. That is the one state on this screen where an accidental Back is
 * expensive, and the only one guarded — the topic and the details are cheap to retype, and a
 * confirm on those would be a nag.
 *
 * <b>Not a danger icon.</b> Nothing has gone wrong; the user asked for something ordinary and
 * we are telling them the cost. The confirm button carries the weight instead, and it is the
 * destructive one because it is the branch that loses the work — see
 * confirmation-dialog.tsx on why the icon is opt-in.
 *
 * Copy names what is lost rather than asking "are you sure": a dialog that only asks for
 * confirmation makes the user reconstruct the stakes themselves.
 */
export const LeaveGenerationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
}: LeaveGenerationDialogProps) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onOpenChange={(open) => {
      // The only close this dialog offers is "stay" — the confirm button navigates away and
      // unmounts the whole screen, so it never comes back through here. Escape and the
      // overlay therefore reset the blocker rather than proceeding, which is the safe
      // default when the gesture was ambiguous.
      if (!open) onCancel();
    }}
    title="The AI is still writing"
    body="Leaving now cancels the generation and spends it — you'll get no questions back, and it still counts against your allowance."
    cancelButtonText="Stay on this page"
    confirmButton={
      <Button variant="destructive" onClick={onConfirm}>
        Leave and cancel
      </Button>
    }
  />
);
