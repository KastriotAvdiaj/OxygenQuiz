import { motion } from "framer-motion";
import { ArrowRight, ImageIcon } from "lucide-react";
import type { PictureDescription } from "./picture-description";
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

/** The words behind the pictures chip, opened (`describePictures`, `ReviewChips`). */
export const PictureDetail = ({ pictures }: { pictures: PictureDescription }) => (
  <>
    <p className="font-medium">{pictures.lead}</p>
    {pictures.detail && <p className="mt-1 text-xs text-muted-foreground">{pictures.detail}</p>}
  </>
);
