import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, Flag, Lock, LockOpen, Sparkles, Trash2, X } from "lucide-react";
import { Card, Button, BlobLoader } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/ui/dialog/confirmation-dialog/confirmation-dialog";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { apiErrorMessage } from "@/lib/Api-client";
import {
  useModerationAction,
  useReportLane,
  useReportLaneCounts,
  type ModerationAction,
  type ReportLane,
  type ReportTarget,
} from "@/features/reports/api/reports";
import { ReportTargetSummary } from "@/features/reports/components/report-target-summary";

const LANES: { value: ReportLane; label: string; empty: string }[] = [
  { value: "Urgent", label: "Urgent", empty: "Nothing urgent." },
  { value: "NeedsAttention", label: "Needs attention", empty: "Nothing waiting on you." },
  { value: "WithAuthor", label: "With author", empty: "No wrong-answer reports waiting on authors." },
  { value: "Resolved", label: "Resolved", empty: "Nothing resolved yet." },
];

/**
 * `/dashboard/reports` — the moderators' queue (docs/media/moderation.md, "The queue").
 * Every action on a reported thing is here, so a decision never needs another page.
 */
export const ModerationReports = () => {
  const [lane, setLane] = useState<ReportLane>("Urgent");
  const counts = useReportLaneCounts();

  return (
    <div className="container mx-auto px-4 py-8 md:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>
      <Card className="bg-card p-4 sm:p-6 border dark:border-foreground/30">
        <Tabs value={lane} onValueChange={(v) => setLane(v as ReportLane)} className="w-full">
          <TabsList className="mb-6 grid h-auto grid-cols-2 gap-1 sm:h-12 sm:grid-cols-4 sm:gap-4">
            {LANES.map((l) => (
              <TabsTrigger
                key={l.value}
                value={l.value}
                className="min-h-[2.75rem] gap-1.5 whitespace-normal px-2 leading-tight sm:min-h-0 sm:whitespace-nowrap sm:px-4"
              >
                {l.label}
                {l.value !== "Resolved" && !!counts.data?.[l.value] && (
                  <span
                    className={
                      l.value === "Urgent"
                        ? "rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white tabular-nums"
                        : "rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary tabular-nums"
                    }
                  >
                    {counts.data[l.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {LANES.map((l) => (
            <TabsContent key={l.value} value={l.value}>
              {lane === l.value && <LaneList lane={l.value} empty={l.empty} />}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
};

const targetKey = (t: ReportTarget) => `${t.targetType}-${t.questionId ?? ""}-${t.quizId ?? ""}`;

function LaneList({ lane, empty }: { lane: ReportLane; empty: string }) {
  const { data, isLoading, isError } = useReportLane(lane);
  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <BlobLoader size="lg" />
      </div>
    );
  if (isError) return <p className="py-8 text-center text-red-500">Couldn't load reports. Try again later.</p>;
  if (!data?.length)
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Flag className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">{empty}</p>
      </div>
    );
  return (
    <motion.ul layout className="space-y-3">
      <AnimatePresence initial={false}>
        {data.map((t) => (
          <motion.li
            key={targetKey(t)}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border border-border p-3"
          >
            <ReportTargetSummary target={t} />
            <TargetActions target={t} resolved={lane === "Resolved"} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

function TargetActions({ target, resolved }: { target: ReportTarget; resolved: boolean }) {
  const action = useModerationAction();
  const { addNotification } = useNotifications();
  const [upholding, setUpholding] = useState(false);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [holdQuiz, setHoldQuiz] = useState(false);
  const [note, setNote] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const run = (a: ModerationAction, done: string) =>
    action.mutate(a, {
      onSuccess: () => {
        addNotification({ type: "success", title: done });
        setUpholding(false);
        setConfirmRemove(false);
      },
      onError: (e) => addNotification({ type: "error", title: "That didn't work", message: apiErrorMessage(e) }),
    });

  const ids = { questionId: target.questionId, quizId: target.targetType === "Quiz" ? target.quizId : null };
  const busy = action.isPending;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {!resolved && (
          <>
            <Button size="sm" disabled={busy} onClick={() => setUpholding((u) => !u)}>
              <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Uphold…
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run({ kind: "resolve", ...ids, outcome: "Rejected" }, "Reports rejected — content restored")}
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Reject
            </Button>
          </>
        )}
        {target.questionId != null && target.mediaUrl && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                { kind: target.mediaHidden ? "show-media" : "hide-media", questionId: target.questionId! },
                target.mediaHidden ? "Media shown" : "Media hidden",
              )
            }
          >
            {target.mediaHidden ? <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
            {target.mediaHidden ? "Show media" : "Hide media"}
          </Button>
        )}
        {target.quizId != null && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run({ kind: target.quizHeld ? "release" : "hold", quizId: target.quizId! }, target.quizHeld ? "Quiz released" : "Quiz held")
            }
          >
            {target.quizHeld ? <LockOpen className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
            {target.quizHeld ? "Release quiz" : "Hold quiz"}
          </Button>
        )}
        {target.quizId != null && !target.quizHeld && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run({ kind: target.quizPicked ? "unpick" : "pick", quizId: target.quizId! }, target.quizPicked ? "Quiz unpicked" : "Quiz picked")
            }
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {target.quizPicked ? "Unpick" : "Pick"}
          </Button>
        )}
        {target.mediaAssetId && (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmRemove(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Remove media
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {upholding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-2 overflow-hidden rounded-md bg-muted/50 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                { kind: "resolve", ...ids, outcome: "Upheld", removeMedia, holdQuiz, note: note.trim() || undefined },
                "Reports upheld",
              );
            }}
          >
            {target.mediaAssetId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={removeMedia} onChange={(e) => setRemoveMedia(e.target.checked)} />
                Remove the media everywhere it's used, and block it from being uploaded again
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={holdQuiz} onChange={(e) => setHoldQuiz(e.target.checked)} />
              {target.targetType === "Quiz" ? "Hold the quiz" : "Hold every quiz this question is in"}
            </label>
            <input
              aria-label="Note (shown to the author and reporters)"
              placeholder="Note (shown to the author and reporters)"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" type="submit" disabled={busy}>
                <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Uphold
              </Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => setUpholding(false)}>
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        isOpen={confirmRemove}
        onOpenChange={setConfirmRemove}
        icon="danger"
        title="Remove this media?"
        body="It's taken off every question and quiz that uses it, deleted from storage, and the same file can't be uploaded again. This can't be undone."
        confirmButton={
          <LiftedButton
            className="flex items-center gap-2 bg-red-600 text-white"
            liftColor="red-700"
            disabled={busy}
            onClick={() => target.mediaAssetId && run({ kind: "remove-media", assetId: target.mediaAssetId }, "Media removed")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove
          </LiftedButton>
        }
      />
    </div>
  );
}

export default ModerationReports;
