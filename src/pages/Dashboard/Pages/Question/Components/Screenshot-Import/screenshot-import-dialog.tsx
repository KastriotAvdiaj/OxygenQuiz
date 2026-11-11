import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ClipboardPaste,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanText,
  Trash2,
  X,
} from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiErrorMessage } from "@/lib/Api-client";
import { myQuestionKeys, questionKeys } from "@/lib/query-keys";
import { cn } from "@/utils/cn";
import {
  QuestionType,
  type QuestionCategory,
  type QuestionDifficulty,
  type QuestionLanguage,
} from "@/types/question-types";
import { createMultipleChoiceQuestion } from "../../api/Multiple_Choice_Question/create-multiple-choice-question";
import { createTrueFalseQuestion } from "../../api/True_False-Question/create-true_false-question";
import { createTypeTheAnswerQuestion } from "../../api/Type_The_Answer-Question/create-type-the-answer-question";
import { isSavable, markRepeats, toCreateRequest, toReviewRow, type ReviewRow } from "./review-model";
import {
  readScreenshot,
  screenshotImportStatusQueryOptions,
  type ScreenshotMakeType,
} from "./screenshot-import-api";
import { ScreenshotReviewRow } from "./screenshot-review-row";

/** The upload pipeline's own limits; the API checks them again. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
/** Images read at once: quick enough, and gentle on the rate limit. */
const CONCURRENCY = 3;

/**
 * The Async Clipboard API's image read — Chrome 76+, Firefox 127+, Safari 13.1+. Where it's
 * missing, the Paste button isn't shown and Ctrl+V (the paste event) still works.
 */
const canReadClipboard = () =>
  typeof navigator !== "undefined" && typeof navigator.clipboard?.read === "function";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The file's contents, hashed — so the same screenshot isn't read (and charged) twice. */
const fingerprint = async (file: File) => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

type ImageStatus = "waiting" | "reading" | "done" | "empty" | "failed";

interface ImageItem {
  id: number;
  number: number;
  file: File;
  hash: string;
  url: string;
  status: ImageStatus;
  error?: string;
}

const MAKE_OPTIONS: { value: ScreenshotMakeType; label: string }[] = [
  { value: "MultipleChoice", label: "Multiple choice" },
  { value: "AsTheyAppear", label: "As they appear" },
  { value: "TypeTheAnswer", label: "Type the answer" },
];

const STATUS_LABEL: Record<ImageStatus, string> = {
  waiting: "Waiting",
  reading: "Reading…",
  done: "Read",
  empty: "No questions found",
  failed: "Didn't read",
};

export interface ScreenshotImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  maxImages: number;
  imagesLeftToday: number | null;
}

/**
 * Screenshot import (docs/quiz/screenshot-import.md): add up to ten images, read them, review what
 * was read, save what you keep. Reading writes nothing; saving goes through the ordinary create
 * endpoints, one question at a time, so every rule a hand-written question meets applies.
 *
 * One blue button per stage (CLAUDE.md, button rank): *Read* until the first questions arrive,
 * then *Save*. Removing an image never removes its questions — once read, the questions are what
 * matter, and a row is skipped by unticking it, so nothing here needs an undo.
 */
export const ScreenshotImportDialog = ({
  open,
  onOpenChange,
  categories,
  difficulties,
  languages,
  maxImages,
  imagesLeftToday,
}: ScreenshotImportDialogProps) => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const reduceMotion = useReducedMotion();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [makeType, setMakeType] = useState<ScreenshotMakeType>("MultipleChoice");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const nextId = useRef(1);
  const abort = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Object URLs are a browser resource: released when the dialog goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const mac = isMac();
  const pasteKeys = mac ? "⌘V" : "Ctrl+V";
  const shotKeys = mac ? "⌘ Shift 4" : "Windows + Shift + S";

  const reading = images.some((i) => i.status === "reading");
  const waiting = images.filter((i) => i.status === "waiting" || i.status === "failed").length;
  const hasRows = rows.length > 0;
  // Once every image is read and their questions are in the list, the thumbnails fold into one
  // line: they stop pushing the questions down. A new image unfolds them again.
  const allRead = images.length > 0 && images.every((i) => i.status === "done" || i.status === "empty");
  const folded = allRead && hasRows && !showImages;

  const reset = () => {
    abort.current?.abort();
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setImages([]);
    setRows([]);
    setAddError(null);
    setShowImages(false);
    setProgress(null);
    nextId.current = 1;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const known = new Map(images.map((i) => [i.hash, i.number]));
    const accepted: ImageItem[] = [];
    const notes: string[] = [];
    let refused = 0;
    for (const file of list) {
      if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES || images.length + accepted.length >= maxImages) {
        refused++;
        continue;
      }
      const hash = await fingerprint(file);
      const same = known.get(hash);
      if (same !== undefined) {
        notes.push(`That image is the same as image ${same} — not added again.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      const id = nextId.current++;
      known.set(hash, id);
      accepted.push({ id, number: id, file, hash, url, status: "waiting" });
    }
    setImages((prev) => [...prev, ...accepted]);
    if (refused > 0)
      notes.push(`${refused} not added — JPEG, PNG or WebP up to 10 MB, at most ${maxImages} images.`);
    setAddError(notes.length > 0 ? notes.join(" ") : null);
  };

  /**
   * The visible way to paste: most people who take a screenshot don't know it's already on their
   * clipboard, or that Ctrl+V would work here. The browser asks for permission the first time
   * (Firefox shows its own small Paste button instead).
   */
  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => ACCEPTED.includes(t));
        if (!type) continue;
        const blob = await item.getType(type);
        files.push(new File([blob], `pasted-${Date.now()}.${type.split("/")[1]}`, { type }));
      }
      if (files.length === 0) {
        setAddError(
          `There's no picture on your clipboard. Take a screenshot (${shotKeys}) or copy an image, then press Paste.`,
        );
        return;
      }
      await addFiles(files);
    } catch {
      setAddError(`Your browser didn't let us read the clipboard. Click here and press ${pasteKeys} instead.`);
    }
  };

  // Its questions stay: they're read, and unticking a row is how one is skipped.
  const removeImage = (id: number) => {
    const item = images.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const setStatus = (id: number, status: ImageStatus, error?: string) =>
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, status, error } : i)));

  /** Reads every waiting (or failed) image, three at a time; rows appear as each finishes. */
  const readAll = async () => {
    const queue = images.filter((i) => i.status === "waiting" || i.status === "failed");
    if (queue.length === 0) return;
    const controller = new AbortController();
    abort.current = controller;
    const total = queue.length;
    let done = 0;
    setProgress({ done, total });
    setShowImages(false);

    const work = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        setStatus(item.id, "reading");
        try {
          const result = await readScreenshot(item.file, makeType, controller.signal);
          const number = item.number;
          setRows((prev) => {
            const others = prev.filter((r) => r.imageNumber !== number);
            return [...others, ...markRepeats(others, result.questions.map((q, i) => toReviewRow(q, number, i)))];
          });
          setStatus(item.id, result.questions.length === 0 ? "empty" : "done");
        } catch (error) {
          if (controller.signal.aborted) return;
          setStatus(item.id, "failed", apiErrorMessage(error));
        }
        setProgress({ done: ++done, total });
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, work));
    if (!controller.signal.aborted) {
      setProgress(null);
      queryClient.invalidateQueries({ queryKey: screenshotImportStatusQueryOptions().queryKey });
    }
  };

  const updateRow = (key: string, patch: Partial<ReviewRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const toSave = rows.filter(isSavable);

  const save = async () => {
    setSaving(true);
    const saved = new Set<string>();
    let failed = 0;
    for (const row of toSave) {
      const request = toCreateRequest(row);
      try {
        if (request.type === QuestionType.TrueFalse) await createTrueFalseQuestion({ data: request.data });
        else if (request.type === QuestionType.MultipleChoice)
          await createMultipleChoiceQuestion({ data: request.data });
        else await createTypeTheAnswerQuestion({ data: request.data });
        saved.add(row.key);
      } catch {
        failed++;
      }
    }
    setSaving(false);
    await queryClient.invalidateQueries({ queryKey: questionKeys.all });
    await queryClient.invalidateQueries({ queryKey: myQuestionKeys.all });

    if (failed === 0) {
      addNotification({ type: "success", title: `Saved ${saved.size} question${saved.size === 1 ? "" : "s"}` });
      handleOpenChange(false);
    } else {
      // The ones that failed stay in the list, so nothing is lost.
      setRows((prev) => prev.filter((r) => !saved.has(r.key)));
      addNotification({
        type: "warning",
        title: `Saved ${saved.size}, ${failed} didn't save`,
        message: "The ones that didn't are still in the list — check them and try again.",
      });
    }
  };

  const readingImages = images.filter((i) => i.status === "reading");
  const sortedRows = [...rows].sort((a, b) => a.imageNumber - b.imageNumber);

  // Motion (docs/development/motion.md): rows arrive, placeholders give way; reduced motion
  // arrives without travelling.
  const enter = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, height: 0, marginTop: 0 },
      };
  const transition = { duration: 0.25, ease: "easeOut" as const };

  // Button colours, one blue per stage: Read until questions arrive, Save after.
  const primary = "flex items-center gap-2";
  const muted = "flex items-center gap-2 bg-muted text-foreground";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-background p-5 sm:max-w-3xl max-h-[90vh] overflow-y-auto dark:border border-foreground/30"
        onPaste={(e) => {
          if (e.clipboardData.files.length > 0) void addFiles(e.clipboardData.files);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="h-5 w-5" aria-hidden="true" />
            Questions from a screenshot
          </DialogTitle>
          <DialogDescription>
            {images.length} of {maxImages} images
            {imagesLeftToday !== null && ` · ${imagesLeftToday} left today`}. Images are read and
            thrown away — never stored.
          </DialogDescription>
        </DialogHeader>

        {images.length === 0 ? (
          // Nothing added yet: say every way in, plainly — not everyone knows they can paste.
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void addFiles(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center gap-3 rounded-md border border-dashed border-foreground/40 px-4 py-6 text-center"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {canReadClipboard() && (
                <LiftedButton type="button" className={primary} onClick={pasteFromClipboard}>
                  <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                  Paste screenshot
                </LiftedButton>
              )}
              <LiftedButton
                type="button"
                className={muted}
                liftColor="muted-foreground"
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                Choose images
              </LiftedButton>
            </div>
            <p className="text-xs text-muted-foreground">
              Or drag them here, or press {pasteKeys}. Took a screenshot with {shotKeys}? It's
              already copied — just paste it.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {images.length < maxImages && (
                <>
                  {canReadClipboard() && (
                    <AddTile onClick={pasteFromClipboard} icon={<ClipboardPaste className="h-4 w-4" aria-hidden="true" />}>
                      Paste
                    </AddTile>
                  )}
                  <AddTile
                    onClick={() => fileInput.current?.click()}
                    onDrop={(files) => void addFiles(files)}
                    icon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
                  >
                    Add more
                  </AddTile>
                </>
              )}
              {allRead && hasRows && (
                <button
                  type="button"
                  onClick={() => setShowImages((s) => !s)}
                  aria-expanded={!folded}
                  className="flex h-11 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  {images.length} image{images.length === 1 ? "" : "s"} read · {folded ? "Show" : "Hide"}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", !folded && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            {/* Below the add buttons, one row that scrolls sideways — on a phone ten thumbnails
                would otherwise stack into a wall above the questions. */}
            <AnimatePresence initial={false}>
              {!folded && (
                <motion.div
                  key="strip"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={transition}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img) => (
                      <figure key={img.id} className="relative w-24 shrink-0">
                        <div className="relative">
                          <img
                            src={img.url}
                            alt={`Image ${img.number}`}
                            className={cn(
                              "h-16 w-24 rounded-md border object-cover dark:border-foreground/30",
                              img.status === "reading" && "opacity-50",
                            )}
                          />
                          {img.status === "reading" && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                        <figcaption className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          {img.number}. {STATUS_LABEL[img.status]}
                          {img.error && <span className="block text-destructive">{img.error}</span>}
                        </figcaption>
                        <div className="absolute right-0.5 top-0.5 flex gap-0.5">
                          {img.status === "failed" && (
                            <button
                              type="button"
                              className="rounded bg-background/90 p-0.5"
                              onClick={() => setStatus(img.id, "waiting")}
                              aria-label={`Try image ${img.number} again`}
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                          {img.status !== "reading" && (
                            <button
                              type="button"
                              className="rounded bg-background/90 p-0.5"
                              onClick={() => removeImage(img.id)}
                              aria-label={`Remove image ${img.number}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </figure>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {addError && <p className="text-xs text-destructive">{addError}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Make them</span>
          <SegmentedControl value={makeType} onValueChange={setMakeType} options={MAKE_OPTIONS} aria-label="Make them" />
          <LiftedButton
            type="button"
            outerClassName="ml-auto"
            className={hasRows ? muted : primary}
            liftColor={hasRows ? "muted-foreground" : undefined}
            disabled={waiting === 0 || reading}
            onClick={readAll}
          >
            {reading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ScanText className="h-4 w-4" aria-hidden="true" />
            )}
            {reading && progress
              ? `Reading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
              : waiting > 0
                ? `Read ${waiting} image${waiting === 1 ? "" : "s"}`
                : "Read images"}
          </LiftedButton>
        </div>

        {(hasRows || readingImages.length > 0) && (
          <ul className="space-y-2" aria-live="polite">
            <AnimatePresence initial={false}>
              {sortedRows.map((row) => (
                <motion.li key={row.key} layout={!reduceMotion} {...enter} transition={transition}>
                  <ScreenshotReviewRow
                    row={row}
                    categories={categories}
                    difficulties={difficulties}
                    languages={languages}
                    onChange={(patch) => updateRow(row.key, patch)}
                  />
                </motion.li>
              ))}
              {readingImages.map((img) => (
                <motion.li key={`reading-${img.id}`} layout={!reduceMotion} {...enter} transition={transition}>
                  <ReadingPlaceholder number={img.number} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <div className="mt-1 flex flex-wrap justify-end gap-3">
          <LiftedButton
            type="button"
            className={hasRows ? primary : muted}
            liftColor={hasRows ? undefined : "muted-foreground"}
            disabled={toSave.length === 0 || saving || reading}
            onClick={save}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Saving…" : `Save ${toSave.length} question${toSave.length === 1 ? "" : "s"}`}
          </LiftedButton>
          <LiftedButton
            type="button"
            className="flex items-center gap-2 bg-background border border-foreground/30 text-foreground"
            liftColor="muted"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </LiftedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** A dashed tile that adds images — Paste, or Add more (which also takes a drop). */
const AddTile = ({
  onClick,
  onDrop,
  icon,
  children,
}: {
  onClick: () => void;
  onDrop?: (files: FileList) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
    onDrop={
      onDrop
        ? (e) => {
            e.preventDefault();
            onDrop(e.dataTransfer.files);
          }
        : undefined
    }
    className="flex h-11 min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-foreground/40 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex-none sm:px-6"
  >
    {icon}
    {children}
  </button>
);

/** Holds an image's place in the list while it's read, in the shape a row will have. */
export const ReadingPlaceholder = ({ number }: { number: number }) => (
  <div className="flex gap-3 rounded-md border bg-card p-3 dark:border-foreground/30">
    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
    <div className="flex-1 space-y-2">
      <p className="text-xs text-muted-foreground">Reading image {number}…</p>
      <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-9 w-2/3 animate-pulse rounded-md bg-muted" />
    </div>
  </div>
);
