import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  ConfirmationDialog,
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

/** Each image's state at a glance: read green, reading blue, failed red, waiting plain. */
const THUMB_BORDER: Record<ImageStatus, string> = {
  waiting: "border-foreground/20",
  reading: "border-primary",
  done: "border-green-600",
  empty: "border-amber-500",
  failed: "border-red-600",
};

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
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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

  // Read questions (or images being read) are work the reader paid for from today's allowance:
  // closing asks first, and a click outside the dialog does nothing.
  const hasWork = rows.length > 0 || reading;

  const close = () => {
    setConfirmDiscard(false);
    reset();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) onOpenChange(true);
    else if (hasWork) setConfirmDiscard(true);
    else close();
  };

  // The browser's own "Leave site?" prompt — a tab closed or reloaded loses the list just the same.
  useEffect(() => {
    if (!open || !hasWork) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, hasWork]);

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

  // Out of the list for good — an image whose question isn't wanted at all (a picture question
  // with no picture to hand, a wrong read). Its image stays above.
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

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
      close();
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

  // Button colours, one blue per stage: Read while there are images to read and no questions yet,
  // Save once questions are in. With nothing to read, Read is muted (it was blue — and disabled —
  // before the first image was added).
  const readIsPrimary = waiting > 0 && !hasRows;
  const primary = "flex items-center gap-2";
  const muted = "flex items-center gap-2 bg-muted text-foreground";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        // One fixed height, whatever the number of questions: the controls stay put and only the
        // question list scrolls (its own box, below). A flex column, so the list takes the rest.
        className="flex h-[min(88vh,56rem)] flex-col gap-4 overflow-hidden bg-background p-5 sm:max-w-3xl dark:border border-foreground/30"
        onInteractOutside={(e) => {
          if (hasWork) e.preventDefault();
        }}
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

        {/* The same two tiles before and after the first image — only the hint goes once an image
            is in, so nothing changes shape under the reader's pointer. */}
        {/* min-w-0: DialogContent is a grid, and a grid item is as wide as its content by default —
            so ten thumbnails widened the whole dialog instead of scrolling inside their row. */}
        <div className="min-w-0 space-y-2">
          {images.length < maxImages && (
            <div className="flex flex-wrap gap-2">
              {canReadClipboard() && (
                <AddTile
                  onClick={pasteFromClipboard}
                  onDrop={(files) => void addFiles(files)}
                  icon={<ClipboardPaste className="h-4 w-4" aria-hidden="true" />}
                >
                  {images.length === 0 ? "Paste screenshot" : "Paste"}
                </AddTile>
              )}
              <AddTile
                onClick={() => fileInput.current?.click()}
                onDrop={(files) => void addFiles(files)}
                icon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
              >
                {images.length === 0 ? "Choose images" : "Add more"}
              </AddTile>
            </div>
          )}
          <AnimatePresence initial={false}>
            {images.length === 0 && (
              // Not everyone knows a screenshot is already on the clipboard.
              <motion.p
                key="hint"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={transition}
                className="overflow-hidden text-xs text-muted-foreground"
              >
                Or drag them onto a tile, or press {pasteKeys}. Took a screenshot with {shotKeys}? It's
                already copied — just paste it.
              </motion.p>
            )}
          </AnimatePresence>

            {allRead && hasRows && (
              <button
                type="button"
                onClick={() => setShowImages((s) => !s)}
                aria-expanded={!folded}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {images.length} image{images.length === 1 ? "" : "s"} read · {folded ? "Show" : "Hide"}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", !folded && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
            )}

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
                  <ThumbnailStrip>
                    {images.map((img) => (
                      <figure key={img.id} className="relative w-24 shrink-0 snap-start">
                        <div className="relative">
                          <img
                            src={img.url}
                            alt={`Image ${img.number}`}
                            className={cn(
                              "h-16 w-24 rounded-md border-2 object-cover transition-[border-color,opacity] duration-200",
                              THUMB_BORDER[img.status],
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
                        <div className="absolute right-1 top-1 flex gap-0.5">
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
                              className="rounded bg-red-600 p-0.5 text-white transition-colors hover:bg-red-700"
                              onClick={() => removeImage(img.id)}
                              aria-label={`Remove image ${img.number}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </figure>
                    ))}
                  </ThumbnailStrip>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
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
          {/* Not there until there's an image: a button with nothing to act on is only noise. */}
          <AnimatePresence initial={false}>
            {images.length > 0 && (
              <motion.div
                key="read"
                className="ml-auto"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                <LiftedButton
                  type="button"
                  className={readIsPrimary ? primary : muted}
                  liftColor={readIsPrimary ? undefined : "muted-foreground"}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The only part that scrolls. px-1/-mx-1: room for the rows' borders and focus rings. */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {/* Holds the list's place before anything is read: says what this space is for. */}
          <AnimatePresence initial={false} mode="popLayout">
            {!hasRows && readingImages.length === 0 && (
              <motion.div
                key="empty-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="flex h-full min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-foreground/30 px-4 py-6 text-center text-sm text-muted-foreground"
              >
                <ScanText className="h-5 w-5" aria-hidden="true" />
                {images.length === 0
                  ? "The questions on your screenshots will appear here once they're read."
                  : "Press Read and the questions on your images will appear here, ready to check."}
              </motion.div>
            )}
          </AnimatePresence>

          {(hasRows || readingImages.length > 0) && (
            <ul className="space-y-2 pb-1" aria-live="polite">
              <AnimatePresence initial={false}>
                {sortedRows.map((row) => (
                  <motion.li key={row.key} layout={!reduceMotion} {...enter} transition={transition}>
                    <ScreenshotReviewRow
                      row={row}
                      categories={categories}
                      difficulties={difficulties}
                      languages={languages}
                      onChange={(patch) => updateRow(row.key, patch)}
                      onRemove={() => removeRow(row.key)}
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
        </div>

        <div className="flex flex-wrap justify-end gap-3">
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

      <ConfirmationDialog
        isOpen={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        icon="danger"
        title="Discard these questions?"
        body={
          reading
            ? "Images are still being read. Closing stops them, and nothing read so far is saved."
            : `${rows.length} question${rows.length === 1 ? " hasn't" : "s haven't"} been saved. Closing throws ${rows.length === 1 ? "it" : "them"} away, and reading the images again counts against today's allowance.`
        }
        cancelButtonText="Keep editing"
        confirmButton={
          <LiftedButton
            type="button"
            className="flex items-center gap-2 bg-red-600 text-white py-1 text-sm"
            liftColor="red-700"
            onClick={close}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Discard
          </LiftedButton>
        }
      />
    </Dialog>
  );
};

/** How far an arrow moves the strip: one thumbnail (w-24) and its gap (gap-2). */
const THUMB_STEP = 104;

/**
 * The thumbnails' row: scrolls sideways on its own (the dialog never does), with ‹ › buttons at
 * each end — a phone has no scrollbar to drag — that move one image at a time and show only when
 * there is somewhere to go.
 */
const ThumbnailStrip = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
  };

  // External system: the element's size and its content's width (images added, dialog resized).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    Array.from(el.children).forEach((c) => observer.observe(c));
    const mutations = new MutationObserver(() => {
      Array.from(el.children).forEach((c) => observer.observe(c));
      measure();
    });
    mutations.observe(el, { childList: true });
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  const scrollBy = (direction: 1 | -1) => ref.current?.scrollBy({ left: direction * THUMB_STEP, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        className="flex snap-x gap-2 overflow-x-auto scroll-smooth pb-1 motion-reduce:scroll-auto [scrollbar-width:thin]"
      >
        {children}
      </div>
      <AnimatePresence>
        {edges.left && <StripArrow key="left" side="left" onClick={() => scrollBy(-1)} />}
        {edges.right && <StripArrow key="right" side="right" onClick={() => scrollBy(1)} />}
      </AnimatePresence>
    </div>
  );
};

const StripArrow = ({ side, onClick }: { side: "left" | "right"; onClick: () => void }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    onClick={onClick}
    aria-label={side === "left" ? "Previous image" : "Next image"}
    className={cn(
      "absolute top-5 flex h-7 w-7 items-center justify-center rounded-full border bg-background/95 shadow-md transition-colors hover:bg-muted dark:border-foreground/30",
      side === "left" ? "left-1" : "right-1",
    )}
  >
    {side === "left" ? (
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
    ) : (
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    )}
  </motion.button>
);

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
    className="flex h-16 min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-foreground/40 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
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
