import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
import type { MediaAsset } from "../api/upload-media";
import { useMediaUpload } from "./use-media-upload";
import { StockSearchPanel } from "./stock-search-panel";

type Source = "upload" | "search";

interface AddMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Questions take an image or a clip; a quiz cover takes images only. */
  allowAudio: boolean;
  /** Called with the stored asset — uploaded or imported, not yet attached (that happens on save). */
  onPicked: (asset: MediaAsset) => void;
}

/**
 * Where the media comes from, behind the picker's one "Add an image or clip" button
 * (docs/media/media-pipeline.md, "Frontend"). Modelled on Kahoot's media window and Google Forms'
 * Insert image dialog: one window, the sources side by side, the device first because it is what
 * most authors reach for. The search tab doesn't name its sources — the credit on each image does.
 */
export function AddMediaDialog({ open, onOpenChange, allowAudio, onPicked }: AddMediaDialogProps) {
  const [source, setSource] = useState<Source>("upload");
  const done = (asset: MediaAsset) => {
    onPicked(asset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* One fixed height for both tabs and every state: results arriving, a tab switch or "More
          results" never resizes the window — only the results area scrolls (2026-10-27). */}
      <DialogContent className="flex h-[min(40rem,85vh)] flex-col sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{allowAudio ? "Add an image or clip" : "Add an image"}</DialogTitle>
        </DialogHeader>

        {/* The app's compact two-way switch (the catalogue's Picked / Community uses it too). */}
        <div className="self-start">
          <SegmentedControl
            aria-label="Where from"
            value={source}
            onValueChange={setSource}
            options={[
              { value: "upload", label: "Upload" },
              { value: "search", label: "Search images" },
            ]}
          />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={source}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Each mounts only while shown, so opening the dialog doesn't ask for the sources. */}
            {source === "upload" ? (
              <UploadPanel allowAudio={allowAudio} onUploaded={done} />
            ) : (
              <StockSearchPanel onPicked={done} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-end">
          <LiftedButton
            type="button"
            className="flex items-center gap-2 border border-foreground/30 bg-background text-foreground"
            liftColor="muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </LiftedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadPanel({ allowAudio, onUploaded }: { allowAudio: boolean; onUploaded: (asset: MediaAsset) => void }) {
  const { pick, isPending, error } = useMediaUpload({ allowAudio, onUploaded });
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const accept = allowAudio
    ? "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.m4a,.ogg"
    : "image/jpeg,image/png,image/webp";

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <label
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={(e) => {
          onDrag(e);
          setDragActive(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-200",
          dragActive ? "border-primary/60 bg-primary/5" : "border-border hover:border-foreground/40",
          isPending ? "cursor-wait" : "cursor-pointer",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={isPending}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = ""; // re-picking the same file must fire again
          }}
          className="sr-only"
          aria-label={allowAudio ? "Choose an image or audio clip" : "Choose an image"}
        />
        {isPending ? (
          <>
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
            <span className="text-sm font-medium">Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">
              {dragActive ? "Drop it here" : (
                <>
                  Drop a file here, or <span className="text-primary underline-offset-2 hover:underline">browse</span>
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {allowAudio ? "JPEG, PNG or WebP up to 10 MB · MP3, M4A or OGG up to 60 s" : "JPEG, PNG or WebP up to 10 MB"}
            </span>
          </>
        )}
      </label>
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 overflow-hidden text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
