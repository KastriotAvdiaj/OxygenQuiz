import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Image as ImageIcon, Music } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import formatDate from "@/lib/date-format";
import { cn } from "@/utils/cn";
import { reasonLabel, type ReportTarget } from "../api/reports";

const OUTCOME_LABEL: Record<string, string> = {
  Fixed: "Fixed by the author",
  NotAMistake: "Not a mistake",
  Upheld: "Upheld",
  Rejected: "Rejected",
};

export const outcomeLabel = (o?: string | null) => (o ? OUTCOME_LABEL[o] ?? o : "");

/**
 * The top of a reported thing, shared by the moderators' queue and the author's page: what it
 * is, what's wrong with it according to whom (never who — reporters stay anonymous), and the
 * reports themselves, collapsed.
 */
export function ReportTargetSummary({ target, showMedia = true }: { target: ReportTarget; showMedia?: boolean }) {
  const [open, setOpen] = useState(false);
  const total = Object.values(target.reasonCounts).reduce((a, b) => a + b, 0) || target.reports.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        {showMedia && target.mediaUrl && target.mediaType === "Image" && (
          <img
            src={target.mediaUrl}
            alt=""
            className={cn("h-16 w-16 shrink-0 rounded-md border object-cover", target.mediaHidden && "opacity-60 blur-sm hover:blur-none")}
          />
        )}
        {showMedia && target.mediaUrl && target.mediaType === "Audio" && (
          <audio controls src={target.mediaUrl} className="h-10 max-w-[220px]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{target.targetType}</Badge>
            {target.mediaHidden && (
              <Badge variant="outline" className="gap-1">
                {target.mediaType === "Audio" ? <Music className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                Media hidden
              </Badge>
            )}
            {target.quizHeld && <Badge variant="outline">Quiz held</Badge>}
            {target.quizPicked && <Badge variant="outline">Picked</Badge>}
          </div>
          <p className="mt-1 break-words font-medium">{target.title}</p>
          <p className="text-xs text-muted-foreground">
            by {target.author} · {total} report{total === 1 ? "" : "s"} · last {formatDate(target.lastReportedAt)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(target.reasonCounts).map(([reason, n]) => (
              <span key={reason} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {reasonLabel(reason)} × {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        {open ? "Hide reports" : "Show reports"}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="divide-y divide-border overflow-hidden rounded-md border"
          >
            {target.reports.map((r) => (
              <li key={r.id} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{reasonLabel(r.reason)}</span>
                  <span>{formatDate(r.createdAt)}</span>
                  {r.outcome && <span>· {outcomeLabel(r.outcome)}</span>}
                </div>
                {r.details && <p className="mt-0.5 whitespace-pre-wrap break-words">{r.details}</p>}
                {r.resolutionNote && <p className="mt-0.5 text-xs text-muted-foreground">Note: {r.resolutionNote}</p>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
