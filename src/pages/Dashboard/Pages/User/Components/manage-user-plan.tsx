import { useState } from "react";
import { SaveIcon } from "lucide-react";
import { Spinner } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { useSetManualPlan, useUserPlan, type UserPlanAdmin } from "@/lib/api/plans";

type Choice = "None" | "Plus" | "Teacher";

/** Mirrors ManualPlanService.MaxNoteLength. */
const MAX_NOTE = 500;

type ManageUserPlanProps = {
  user: { id: string; username: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Admin: give a user a plan, change it, or take it back (docs/auth/paid-plans.md, "Manual
 * grants"). A comp, a pilot school, a test account in production. Granting Teacher also grants
 * the Teacher role server-side; revoking never removes it.
 *
 * Rendered outside the row's dropdown, like ChangeUserRole, so the open menu can't steal focus.
 */
export const ManageUserPlan = ({ user, open, onOpenChange }: ManageUserPlanProps) => {
  const plan = useUserPlan(open ? user.id : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Plan for {user.username}</DialogTitle>
        </DialogHeader>
        {plan.isLoading || !plan.data ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          // Keyed on the loaded data: the form's working state starts from the server's answer
          // and resets when it changes, without an Effect copying props into state.
          <PlanForm
            key={`${plan.data.manualPlan}-${plan.data.manualEndsAt}`}
            userId={user.id}
            username={user.username}
            current={plan.data}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const PlanForm = ({
  userId,
  username,
  current,
  onDone,
}: {
  userId: string;
  username: string;
  current: UserPlanAdmin;
  onDone: () => void;
}) => {
  const { addNotification } = useNotifications();
  const [choice, setChoice] = useState<Choice>(
    current.manualPlan === "Plus" || current.manualPlan === "Teacher" ? current.manualPlan : "None",
  );
  const [endsAt, setEndsAt] = useState(current.manualEndsAt?.slice(0, 10) ?? "");
  const [note, setNote] = useState(current.manualNote ?? "");
  const mutation = useSetManualPlan(userId);

  const save = () =>
    mutation.mutate(
      {
        plan: choice === "None" ? null : choice,
        // End of that day, UTC — "until 31 Oct" should include 31 Oct.
        endsAt: choice !== "None" && endsAt ? `${endsAt}T23:59:59Z` : null,
        note: note.trim() || null,
      },
      {
        onSuccess: (result) => {
          addNotification({
            type: "success",
            title: "Plan updated",
            message: `${username} is now on ${result.plan}.`,
          });
          onDone();
        },
      },
    );

  return (
    <>
      <div className="space-y-4 text-foreground">
        <p className="text-sm text-muted-foreground">
          Current plan: <span className="font-semibold text-foreground">{current.plan}</span>
          {current.isStaff && " (staff — limits don't apply)"}
          {current.planEndsAt && ` until ${new Date(current.planEndsAt).toLocaleDateString()}`}
        </p>

        <div className="space-y-2">
          <Label>Granted plan</Label>
          <SegmentedControl<Choice>
            aria-label="Granted plan"
            value={choice}
            onValueChange={setChoice}
            options={[
              { value: "None", label: "None" },
              { value: "Plus", label: "Plus" },
              { value: "Teacher", label: "Teacher" },
            ]}
          />
          {choice === "Teacher" && (
            <p className="text-xs text-muted-foreground">
              Also gives the Teacher role if they don't have it. Taking the plan away later keeps the role.
            </p>
          )}
        </div>

        {choice !== "None" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="plan-ends-at">Ends on (optional)</Label>
              <Input
                id="plan-ends-at"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-note">Note (optional)</Label>
              <Textarea
                id="plan-note"
                value={note}
                maxLength={MAX_NOTE}
                placeholder="Why — e.g. pilot school, competition prize"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <LiftedButton
          className="text-white text-sm"
          isPending={mutation.isPending}
          disabled={mutation.isPending}
          onClick={save}
        >
          <SaveIcon className="h-4 w-4" aria-hidden="true" />
          Save
        </LiftedButton>
        <LiftedButton
          className="text-sm bg-background border border-foreground/30 text-foreground"
          liftColor="muted"
          onClick={onDone}
        >
          Cancel
        </LiftedButton>
      </DialogFooter>
    </>
  );
};
