import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, RotateCcw, ScanText, Trash2, X } from "lucide-react";

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
import {
  QuestionType,
  type QuestionCategory,
  type QuestionDifficulty,
  type QuestionLanguage,
} from "@/types/question-types";
import { createMultipleChoiceQuestion } from "../../api/Multiple_Choice_Question/create-multiple-choice-question";
import { createTrueFalseQuestion } from "../../api/True_False-Question/create-true_false-question";
import { createTypeTheAnswerQuestion } from "../../api/Type_The_Answer-Question/create-type-the-answer-question";
import { isSavable, toCreateRequest, toReviewRow, type ReviewRow } from "./review-model";
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

type ImageStatus = "waiting" | "reading" | "done" | "empty" | "failed";

interface ImageItem {
  id: number;
  number: number;
  file: File;
  url: string;
  status: ImageStatus;
  error?: string;
}

const MAKE_OPTIONS: { value: ScreenshotMakeType; label: string }[] = [
  { value: "MultipleChoice", label: "Multiple choice" },
  { value: "AsTheyAppear", label: "As they appear" },
  { value: "TypeTheAnswer", label: "Type the answer" },
];

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
 * Images stay in this browser tab — the server reads and discards them.
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
  const [images, setImages] = useState<ImageItem[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [makeType, setMakeType] = useState<ScreenshotMakeType>("MultipleChoice");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nextId = useRef(1);
  const abort = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Object URLs are a browser resource: released when the dialog goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const reading = images.some((i) => i.status === "reading");

  const reset = () => {
    abort.current?.abort();
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setImages([]);
    setRows([]);
    setAddError(null);
    nextId.current = 1;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    const room = maxImages - images.length;
    const accepted: ImageItem[] = [];
    let refused = 0;
    for (const file of list) {
      if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES || accepted.length >= room) {
        refused++;
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      const id = nextId.current++;
      accepted.push({ id, number: id, file, url, status: "waiting" });
    }
    setImages((prev) => [...prev, ...accepted]);
    setAddError(
      refused > 0
        ? `${refused} not added — JPEG, PNG or WebP up to 10 MB, at most ${maxImages} images.`
        : null,
    );
  };

  const removeImage = (id: number) => {
    const item = images.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setImages((prev) => prev.filter((i) => i.id !== id));
    setRows((prev) => prev.filter((r) => r.imageNumber !== item?.number));
  };

  const setStatus = (id: number, status: ImageStatus, error?: string) =>
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, status, error } : i)));

  /** Reads every waiting (or failed) image, three at a time; rows appear as each finishes. */
  const readAll = async () => {
    const queue = images.filter((i) => i.status === "waiting" || i.status === "failed");
    if (queue.length === 0) return;
    const controller = new AbortController();
    abort.current = controller;

    const work = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        setStatus(item.id, "reading");
        try {
          const result = await readScreenshot(item.file, makeType, controller.signal);
          const number = item.number;
          setRows((prev) => [
            ...prev.filter((r) => r.imageNumber !== number),
            ...result.questions.map((q, i) => toReviewRow(q, number, i)),
          ]);
          setStatus(item.id, result.questions.length === 0 ? "empty" : "done");
        } catch (error) {
          if (controller.signal.aborted) return;
          setStatus(item.id, "failed", apiErrorMessage(error));
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, work));
    if (!controller.signal.aborted)
      queryClient.invalidateQueries({ queryKey: screenshotImportStatusQueryOptions().queryKey });
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
      addNotification({
        type: "success",
        title: `Saved ${saved.size} question${saved.size === 1 ? "" : "s"}`,
      });
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

  const waiting = images.filter((i) => i.status === "waiting" || i.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-background p-5 sm:max-w-3xl max-h-[90vh] overflow-y-auto dark:border border-foreground/30"
        onPaste={(e) => {
          if (e.clipboardData.files.length > 0) addFiles(e.clipboardData.files);
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

        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <figure key={img.id} className="relative w-24">
              <img
                src={img.url}
                alt={`Image ${img.number}`}
                className="h-16 w-24 rounded-md border object-cover dark:border-foreground/30"
              />
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
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex h-16 min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-foreground/40 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Drop, paste or choose images
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {addError && <p className="text-xs text-destructive">{addError}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Make them</span>
          <SegmentedControl
            value={makeType}
            onValueChange={setMakeType}
            options={MAKE_OPTIONS}
            aria-label="Question type"
          />
          <LiftedButton
            type="button"
            outerClassName="ml-auto"
            className="flex items-center gap-2 bg-muted text-foreground"
            liftColor="muted-foreground"
            disabled={waiting === 0 || reading}
            onClick={readAll}
          >
            <ScanText className="h-4 w-4" aria-hidden="true" />
            {reading ? "Reading…" : waiting > 0 ? `Read ${waiting} image${waiting === 1 ? "" : "s"}` : "Read images"}
          </LiftedButton>
        </div>

        {rows.length > 0 && (
          <ul className="space-y-2">
            {[...rows]
              .sort((a, b) => a.imageNumber - b.imageNumber)
              .map((row) => (
                <ScreenshotReviewRow
                  key={row.key}
                  row={row}
                  categories={categories}
                  difficulties={difficulties}
                  languages={languages}
                  onChange={(patch) => updateRow(row.key, patch)}
                />
              ))}
          </ul>
        )}

        <div className="mt-1 flex flex-wrap justify-end gap-3">
          <LiftedButton
            type="button"
            className="flex items-center gap-2"
            disabled={toSave.length === 0 || saving || reading}
            onClick={save}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
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

const STATUS_LABEL: Record<ImageStatus, string> = {
  waiting: "Waiting",
  reading: "Reading…",
  done: "Read",
  empty: "No questions found",
  failed: "Didn't read",
};
