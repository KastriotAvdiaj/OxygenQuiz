import { motion } from "framer-motion";
import { ArrowRight, ImageIcon } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";

/**
 * Between the reply and the review, while the pictures the model asked for are found
 * (docs/media/media-pipeline.md, "AI-added images"). Usually a second or two; *Skip* goes on with
 * whatever has arrived, and a picture can always be added in the review.
 */
export function AutoImagesProgress({
  found,
  settled,
  requested,
  onSkip,
}: {
  found: number;
  settled: number;
  requested: number;
  onSkip: () => void;
}) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-10 text-center dark:border-foreground/30"
    >
      <ImageIcon className="h-8 w-8 animate-pulse text-primary" aria-hidden="true" />
      <div>
        <p className="font-semibold">Finding pictures for your questions…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {settled} of {requested} searched{found > 0 ? ` · ${found} found` : ""} — free images from Wikimedia Commons and Pexels.
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${requested ? Math.round((settled / requested) * 100) : 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
      <LiftedButton
        size="sm"
        className="flex items-center gap-2 bg-muted text-foreground"
        liftColor="muted-foreground"
        onClick={onSkip}
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        Skip to the review
      </LiftedButton>
    </motion.div>
  );
}

/**
 * On the review: which pictures came from where, and which questions asked for one and got none.
 * Not a warning — a picture is optional — but not silent either (ADR 0005's rule for what the
 * import changed). Nothing when no picture was asked for.
 */
export function AutoImageNotice({ requested, notFound }: { requested: number; notFound: number[] }) {
  if (requested === 0) return null;
  const added = requested - notFound.length;
  return (
    <div
      role="status"
      className="mx-auto w-full max-w-[1600px] rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
    >
      <p className="flex items-center gap-2 font-medium">
        <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {added > 0
          ? `Added a picture to ${added} question${added === 1 ? "" : "s"} — check each one; swap or remove it in the question.`
          : "No pictures were found for the questions that asked for one."}
      </p>
      {notFound.length > 0 && added > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          None found for question{notFound.length === 1 ? "" : "s"} {notFound.join(", ")}. You can add one yourself.
        </p>
      )}
    </div>
  );
}
