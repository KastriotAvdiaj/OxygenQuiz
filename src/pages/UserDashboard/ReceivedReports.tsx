import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag, MessageSquareWarning, X } from "lucide-react";
import { Card, BlobLoader } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { apiErrorMessage } from "@/lib/Api-client";
import { useReceivedReports, useRespondToReports, type ReportTarget } from "@/features/reports/api/reports";
import { ReportTargetSummary } from "@/features/reports/components/report-target-summary";

/**
 * `/my-dashboard/reports` — wrong-answer reports on the author's own questions and quizzes
 * (docs/media/moderation.md, "Wrong answers go to the author first"). The author fixes it or
 * explains why it's right; left alone, the reports go to moderators after 5 reports or 7 days.
 */
export const ReceivedReports = () => {
  const { data, isLoading, isError } = useReceivedReports();
  return (
    <div className="container mx-auto px-4 py-8 md:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>
      <Card className="bg-card p-4 sm:p-6 border dark:border-foreground/30">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <BlobLoader size="lg" />
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-red-500">Couldn't load your reports. Try again later.</p>
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Flag className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              Nobody has reported a mistake in your quizzes. When someone does, it shows up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {data.map((t) => (
                <motion.li
                  key={`${t.targetType}-${t.questionId ?? ""}-${t.quizId ?? ""}`}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border border-border p-3"
                >
                  <ReportTargetSummary target={t} showMedia={false} />
                  <Respond target={t} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
};

function Respond({ target }: { target: ReportTarget }) {
  const respond = useRespondToReports();
  const { addNotification } = useNotifications();
  const [explaining, setExplaining] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ids = { questionId: target.questionId, quizId: target.targetType === "Quiz" ? target.quizId : null };

  const send = (outcome: "Fixed" | "NotAMistake") => {
    if (outcome === "NotAMistake" && !note.trim()) {
      setError("Say why it's correct — the reporters see this.");
      return;
    }
    setError(null);
    respond.mutate(
      { ...ids, outcome, note: note.trim() || undefined },
      {
        onSuccess: () =>
          addNotification({
            type: "success",
            title: outcome === "Fixed" ? "Marked as fixed" : "Answer sent",
            message: "Everyone who reported it will be told.",
          }),
        onError: (e) => setError(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <LiftedButton size="sm" className="flex items-center gap-2" disabled={respond.isPending} onClick={() => send("Fixed")}>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          I fixed it
        </LiftedButton>
        <LiftedButton
          size="sm"
          className="flex items-center gap-2 bg-muted text-foreground"
          liftColor="muted-foreground"
          onClick={() => setExplaining((x) => !x)}
        >
          <MessageSquareWarning className="h-3.5 w-3.5" aria-hidden="true" />
          It's not a mistake
        </LiftedButton>
      </div>
      <AnimatePresence initial={false}>
        {explaining && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-2 overflow-hidden"
          >
            <textarea
              aria-label="Why it's correct"
              placeholder="Why it's correct (a source helps)"
              value={note}
              maxLength={500}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <LiftedButton size="sm" className="flex items-center gap-2" disabled={respond.isPending} onClick={() => send("NotAMistake")}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Send
              </LiftedButton>
              <LiftedButton
                size="sm"
                className="flex items-center gap-2 border border-foreground/30 bg-background text-foreground"
                liftColor="muted"
                onClick={() => setExplaining(false)}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </LiftedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default ReceivedReports;
