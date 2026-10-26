import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Image as ImageIcon, Music, Upload, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { toSelection, type MediaAsset, type MediaSelection } from "../api/upload-media";
import { MediaCreditLine } from "./media-credit";
import { AddMediaDialog } from "./add-media-dialog";
import { useMediaUpload } from "./use-media-upload";

interface MediaPickerProps {
  /** What's attached now — from the form's state. Null for nothing. */
  value: MediaSelection | null;
  /** Called with the uploaded asset, or null on Remove. The caller stores `assetId` for the save. */
  onChange: (value: MediaSelection | null) => void;
  /** Questions take an image or a clip; a quiz cover takes images only. */
  allowAudio?: boolean;
  disabled?: boolean;
  /** Complete Tailwind classes for the preview frame — the quiz builder passes its question-type
   *  hue (question-type-color-schema.md). Never built by interpolation. */
  frameClassName?: string;
  className?: string;
}

/**
 * The one control for attaching media to a question or a quiz (docs/media/media-pipeline.md).
 * One button: pressing it opens `AddMediaDialog` (upload from the device, or search free images);
 * dropping a file straight onto it uploads it without the detour.
 * Uploading only stores the file; nothing is attached — and nothing counts against the author's
 * daily allowance — until the form is saved with the returned asset id.
 *
 * Replaces `utils/Image-Upload.tsx`, which posted to the retired `/ImageUpload/question` endpoint,
 * took images only, and handed the form a URL to send back — the hole the pipeline closed.
 */
export function MediaPicker({
  value,
  onChange,
  allowAudio = true,
  disabled = false,
  frameClassName = "border-primary/30 bg-primary/[0.04]",
  className,
}: MediaPickerProps) {
  const reduceMotion = useReducedMotion();
  const [dragActive, setDragActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const attach = (asset: MediaAsset) => onChange(toSelection(asset));
  const direct = useMediaUpload({ allowAudio, onUploaded: attach });

  const remove = () => {
    direct.clearError();
    onChange(null);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const fade = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

  const busy = disabled || direct.isPending;

  return (
    <div className={cn("w-full max-w-xs sm:max-w-sm mx-auto", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.div key={value.assetId} {...fade} transition={{ duration: 0.18 }} className="space-y-2">
            <div className={cn("rounded-xl border-2 p-1.5", frameClassName)}>
              {value.kind === "Audio" ? (
                <audio controls src={value.url} className="w-full" aria-label="Attached audio clip" />
              ) : (
                // `contain`, not `cover`: the author is checking they picked the right image, and
                // a cropped preview hides what they'd want to catch — a subject cut off at the edge.
                <img
                  src={value.url}
                  alt="Attached image"
                  className="mx-auto h-auto max-h-36 w-full rounded-lg object-contain sm:max-h-40"
                />
              )}
            </div>
            {value.credit && <MediaCreditLine credit={value.credit} className="text-center" />}
            <button
              type="button"
              onClick={remove}
              disabled={disabled}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {value.kind === "Audio" ? "Remove clip" : "Remove image"}
            </button>
          </motion.div>
        ) : (
          // A slim row, not a big dropzone: optional media shouldn't out-shout the question.
          <motion.div key="empty" {...fade} transition={{ duration: 0.18 }} className="space-y-1.5">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={busy}
              title={allowAudio ? "Upload an image or audio clip, or search free images" : "Upload an image, or search free images"}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={(e) => {
                onDrag(e);
                setDragActive(false);
                if (!busy) direct.pick(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "relative flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors duration-200",
                dragActive
                  ? "border-primary/60 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                busy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              {direct.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  {dragActive ? (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {allowAudio && !dragActive && <Music className="-ml-1 h-4 w-4" aria-hidden="true" />}
                  <span className="font-medium">
                    {dragActive ? "Drop it here" : allowAudio ? "Add an image or clip" : "Add an image"}
                  </span>
                  <span className="text-xs text-muted-foreground">· optional</span>
                </>
              )}
            </button>
            <AnimatePresence>
              {direct.error && (
                <motion.p
                  role="alert"
                  {...fade}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {direct.error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <AddMediaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allowAudio={allowAudio}
        onPicked={(asset) => {
          direct.clearError();
          attach(asset);
        }}
      />
    </div>
  );
}
