import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Flag, LogIn, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/form";
import { useUser } from "@/lib/Auth";
import { apiErrorMessage } from "@/lib/Api-client";
import { cn } from "@/utils/cn";
import { REPORT_REASONS, submitReportSchema, useSubmitReport, type ReportReason } from "../api/reports";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A question (with the quiz it was seen in, when known) or a whole quiz. */
  questionId?: number;
  quizId?: number;
}

/**
 * Report a question or a quiz (docs/media/moderation.md). One dialog for every reason — a wrong
 * answer is the common case and asks for the correct one, which goes to the author; harmful reasons
 * go to moderators. Guests are asked to sign in: a report needs someone to hold to it.
 */
export function ReportDialog({ open, onOpenChange, questionId, quizId }: ReportDialogProps) {
  const user = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const addNotification = useNotifications((s) => s.addNotification);
  const submit = useSubmitReport();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const target = questionId ? "question" : "quiz";
  const chosen = REPORT_REASONS.find((r) => r.value === reason);

  const close = () => {
    onOpenChange(false);
    setReason("");
    setDetails("");
    setError(null);
  };

  const send = () => {
    const parsed = submitReportSchema.safeParse({
      questionId,
      quizId,
      reason: reason || undefined,
      details: details.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setError(null);
    submit.mutate(parsed.data, {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Thanks for the report",
          message: "We'll let you know what happens.",
        });
        close();
      },
      onError: (e) => setError(apiErrorMessage(e)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="bg-background text-foreground sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" aria-hidden="true" />
            Report this {target}
          </DialogTitle>
        </DialogHeader>

        {!user.data ? (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in to report a {target}. We need to know who reported something so we can tell you
              what happened — and so reports can't be sent by the hundred.
            </p>
            <DialogFooter>
              <LiftedButton
                outerClassName="w-full sm:w-auto"
                className="flex items-center gap-2"
                onClick={() => navigate(`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`)}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in
              </LiftedButton>
            </DialogFooter>
          </>
        ) : (
          <>
            <RadioGroup
              value={reason}
              onValueChange={(v) => {
                setReason(v as ReportReason);
                setError(null);
              }}
              className="gap-1.5"
              aria-label="Reason"
            >
              {REPORT_REASONS.map((r) => (
                <Label
                  key={r.value}
                  htmlFor={`report-reason-${r.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-normal transition-colors",
                    reason === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem id={`report-reason-${r.value}`} value={r.value} />
                  {r.label}
                </Label>
              ))}
            </RadioGroup>

            <AnimatePresence initial={false}>
              {chosen && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <Label htmlFor="report-details" className="mb-1 block text-sm font-medium">
                    {reason === "WrongAnswer"
                      ? "What's the correct answer?"
                      : chosen.detailsRequired
                        ? "What's wrong?"
                        : "Anything to add? (optional)"}
                  </Label>
                  <textarea
                    id="report-details"
                    value={details}
                    maxLength={1000}
                    rows={3}
                    onChange={(e) => setDetails(e.target.value)}
                    // ring-inset: the wrapper is overflow-hidden (for its height animation), which
                    // clipped an outside focus ring and made the box look like it broke its edges.
                    className="block w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    placeholder={reason === "WrongAnswer" ? "e.g. Prishtina is the capital, not Prizren — source…" : ""}
                  />
                  {reason === "WrongAnswer" && (
                    <p className="mt-1 text-xs text-muted-foreground">The author sees this, but not who sent it.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2">
              {/* size="sm" + sm:py-1: compact on a pointer device; phones keep the 36px tap
                  floor (docs/RESPONSIVE.md). The spinner takes the check's place while it sends. */}
              <LiftedButton
                size="sm"
                className="flex items-center gap-2 bg-red-600 text-white sm:py-1"
                liftColor="red-700"
                isPending={submit.isPending}
                onClick={send}
              >
                {!submit.isPending && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {submit.isPending ? "Sending…" : "Send report"}
              </LiftedButton>
              <LiftedButton
                size="sm"
                className="flex items-center gap-2 border border-foreground/30 bg-background text-foreground sm:py-1"
                liftColor="muted"
                disabled={submit.isPending}
                onClick={close}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </LiftedButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A small "Report" link that opens the dialog — for play and results screens. Pass `trigger` to
 * draw your own control instead (the quiz start card's icon button); it gets the opener.
 */
export function ReportButton({
  questionId,
  quizId,
  label = "Report",
  className,
  trigger,
}: {
  questionId?: number;
  quizId?: number;
  label?: string;
  className?: string;
  trigger?: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (trigger)
    return (
      <>
        {trigger(() => setOpen(true))}
        <ReportDialog open={open} onOpenChange={setOpen} questionId={questionId} quizId={quizId} />
      </>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
          className,
        )}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
      <ReportDialog open={open} onOpenChange={setOpen} questionId={questionId} quizId={quizId} />
    </>
  );
}
