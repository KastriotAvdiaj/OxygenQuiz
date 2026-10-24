import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useUser } from "@/lib/Auth";
import type { QuestionMediaType } from "@/types/question-types";
import { fetchHiddenMedia } from "@/features/reports/api/reports";

interface QuestionMediaProps {
  /** Absolute URL of the attachment. Null when there is none — or when it is hidden and this is a
   *  play screen, which is never sent a hidden file's URL. */
  mediaUrl?: string | null;
  mediaType?: QuestionMediaType | null;
  /** Under a moderation cover pending review (docs/media/moderation.md, "Hiding"). */
  hidden?: boolean;
  /** Needed for "Show anyway" when the URL wasn't sent (play screens). */
  questionId?: number;
  alt?: string;
  className?: string;
}

/**
 * Renders a question's image or audio clip. Returns `null` when there's nothing to show, so callers
 * can drop it in unconditionally. Shared by every screen that shows a question.
 *
 * Hidden media sits under a cover. A signed-in viewer can choose **Show anyway** — the convention
 * on every large platform, and what keeps a false report from ruining a question; a guest, who may
 * be a minor, can't. The server enforces that half: play responses carry no hidden URL, and
 * fetching it needs an account.
 */
export function QuestionMedia({ mediaUrl, mediaType, hidden = false, questionId, alt = "Question media", className }: QuestionMediaProps) {
  const user = useUser();
  const [revealed, setRevealed] = useState<{ url: string; kind: QuestionMediaType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!hidden && !mediaUrl) return null;

  if (hidden && !revealed) {
    const canReveal = !!user.data && (!!mediaUrl || questionId != null);
    const reveal = async () => {
      if (mediaUrl) {
        setRevealed({ url: mediaUrl, kind: mediaType && mediaType !== "None" ? mediaType : "Image" });
        return;
      }
      if (questionId == null) return;
      setLoading(true);
      setFailed(false);
      try {
        const media = await fetchHiddenMedia(questionId);
        setRevealed({ url: media.mediaUrl, kind: media.mediaType });
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40 px-4 py-6 text-center",
          className,
        )}
      >
        <EyeOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {mediaType === "Audio" ? "Audio" : "Image"} hidden — reported as inappropriate
        </p>
        <p className="text-xs text-muted-foreground">It's being reviewed.</p>
        {canReveal && (
          <button
            type="button"
            onClick={reveal}
            disabled={loading}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            Show anyway
          </button>
        )}
        {failed && <p className="text-xs text-red-600">It couldn't be loaded — it may have been removed.</p>}
      </div>
    );
  }

  const url = revealed?.url ?? mediaUrl!;
  const kind: QuestionMediaType = revealed?.kind ?? (mediaType && mediaType !== "None" ? mediaType : "Image");

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={url}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(kind === "Image" ? "mx-auto w-fit max-w-full" : "mx-auto w-full max-w-md", className)}
      >
        {kind === "Audio" ? (
          <audio controls src={url} className="w-full" />
        ) : kind === "Video" ? (
          <video
            controls
            src={url}
            className="mx-auto max-h-72 w-full rounded-xl border-2 border-primary/20 bg-background object-contain"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border-2 border-primary/20 bg-background p-1.5">
            <img src={url} alt={alt} loading="lazy" className="mx-auto max-h-64 w-auto rounded-lg object-contain" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default QuestionMedia;
