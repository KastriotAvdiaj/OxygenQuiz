import { useRef } from "react";
import { AlertTriangle, FileUp, Loader2 } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { Input, Label, Textarea } from "@/components/ui/form";
import { cn } from "@/utils/cn";

import type { AiGenerationMode } from "../../../api/generate-ai-quiz";
import { AI_QUESTION_LIMITS } from "../prompt";

/** One id for both branches — only ever one field is mounted, so they can't collide. */
const FieldError = ({ error }: { error?: string }) =>
  error ? (
    <p
      id="ai-input-error"
      role="alert"
      className="text-destructive text-xs mt-1.5 flex items-center gap-1"
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {error}
    </p>
  ) : null;

/**
 * The one field that has to be filled in, marked as such.
 *
 * An eyebrow above the question rather than a chip beside it. A chip sat on the baseline of a
 * `text-xl` heading and read as a badge — decoration attached to the words — where this reads
 * as what it is: the label for the group underneath. It pairs with the "Optional" eyebrow over
 * the details form, so the two halves of the card are marked the same way and the contrast
 * between them is the whole point. Muted rather than `destructive`: nothing has gone wrong
 * yet, and a red mark on an untouched field is a validation style, not a hint.
 */
const RequiredEyebrow = () => (
  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
    Required
  </p>
);

/** What the server read out of an uploaded file — shown under the box while it holds that text. */
export interface SourceFileInfo {
  name: string;
  /** "English" or "Albanian": the language the questions will be written in. */
  language: string;
  /** Only the first `AI_QUESTION_LIMITS.maxSourceChars` characters were kept. */
  truncated: boolean;
}

/**
 * What the file picker offers. Mirrors the extensions `SourceFileReader` accepts on the server,
 * which is the gate — a file that slips past this (renamed, dropped) is refused there by name.
 */
const ACCEPTED_FILES = ".pdf,.docx,.txt,.md";

const numberFormat = new Intl.NumberFormat();

export interface GenerationInputProps {
  mode: AiGenerationMode;
  topic: string;
  onTopicChange: (value: string) => void;
  sourceData: string;
  onSourceDataChange: (value: string) => void;
  /** Inputs lock while a generation is in flight — editing them mid-call changes nothing. */
  disabled: boolean;
  /**
   * Shown under the field, with the control marked invalid. Set only after the user presses
   * Generate: nagging someone about an empty box they haven't finished filling is worse than
   * saying nothing.
   */
  error?: string;
  /**
   * The screen's primary action, run when Enter is pressed in the **topic** field.
   *
   * Pass the same guarded handler the primary button uses, not the raw action — Enter and
   * the button must fail identically, or Enter becomes a way to skip validation.
   *
   * Only the topic branch wires this up. In Source mode the control is a textarea, where
   * Enter legitimately means "new line"; hijacking it there would stop people formatting
   * the material they are pasting.
   */
  onSubmit?: () => void;
  /**
   * Source mode: read a file into the box. The text replaces whatever was there — one source
   * per quiz, and appending to a half-pasted note would be a guess about what the user meant.
   */
  onUploadFile?: (file: File) => void;
  /** A file is being read on the server; the box and the button wait for it. */
  isReadingFile?: boolean;
  /** The file the box's text came from, or null when it was typed or pasted. */
  sourceFile?: SourceFileInfo | null;
  /** Why the last file couldn't be used — the server's message, which names the fix. */
  uploadError?: string;
}

/**
 * The one box: say what the quiz is about.
 *
 * `mode` picks which of the two fields is mounted, and it comes from the route — the choice
 * is made in the create-quiz method dialog before this screen loads. It used to be a
 * `GenerationModeTabs` strip welded to the top of the wizard card; that component lived here
 * and was deleted with the strip. Topic and source are still two shapes of one question, so
 * they still share this control rather than becoming two components — see
 * docs/quiz/ai-quiz-two-paths.md §3.
 *
 * Both branches wear the same heading size. They are the same question in two shapes, and
 * with the details form now visible underneath, a `text-sm` label on one of them would sink
 * the lead question to the weight of "Quiz title".
 */
export const GenerationInput = ({
  mode,
  topic,
  onTopicChange,
  sourceData,
  onSourceDataChange,
  disabled,
  error,
  onSubmit,
  onUploadFile,
  isReadingFile = false,
  sourceFile = null,
  uploadError,
}: GenerationInputProps) => (
  <>
    {mode === "Topic" ? (
      <div>
        <RequiredEyebrow />
        <Label htmlFor="ai-topic" className="mt-0.5 block text-xl font-medium short:text-lg">
          What should this quiz be about?
        </Label>
        <Input
          id="ai-topic"
          variant="minimal"
          className={cn("mt-1 text-base", error && "minimal-input--error")}
          // An example, not an instruction. "Type your topic here" restates the label
          // directly above it and teaches nothing; the useful unknown for a first-time user
          // is not *that* a topic goes here but how specific one may be — that an audience
          // and a slant are allowed, not just a noun. Carried in the placeholder rather than
          // a helper line under the field: it costs no vertical space on a screen whose
          // primary action is 60px above the fold by budget
          // (docs/adr/0002-quiz-creation-routes-hide-the-dashboard-header.md), and a hint
          // that only matters while the box is empty should leave with the empty box.
          placeholder="e.g. World War II, for high-school students"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !onSubmit) return;
            // There is no <form> on this screen, so nothing submits on its own.
            // preventDefault anyway: a stray implicit submission from a future wrapper
            // would reload the page and lose everything typed.
            e.preventDefault();
            onSubmit();
          }}
          // Phone keyboards label their own action key, and the default is "return" —
          // which on a single-line field reads as "make a new line" and hides the fact
          // that Enter does anything at all (docs/RESPONSIVE.md). It is a label only:
          // the handler above is what actually does the work.
          enterKeyHint="go"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "ai-input-error" : undefined}
        />
        <FieldError error={error} />
      </div>
    ) : (
      <SourceField
        sourceData={sourceData}
        onSourceDataChange={onSourceDataChange}
        disabled={disabled}
        error={error}
        onUploadFile={onUploadFile}
        isReadingFile={isReadingFile}
        sourceFile={sourceFile}
        uploadError={uploadError}
      />
    )}
  </>
);

/**
 * The material box: paste, or upload a file and review what was read from it.
 *
 * **One box for both.** An upload fills the textarea with the extracted text rather than
 * showing a file chip, because what the model reads is that text, not the file — a PDF can
 * come out with a header on every page or a table flattened into a run of numbers, and the
 * place to notice is before spending a generation. The user can trim it right there.
 *
 * **The 40,000-character limit is a hard stop** (`maxLength`), mirroring `Ai:MaxSourceChars`.
 * The server cuts anything longer anyway, and a counter that turns amber near the end says so
 * before the user finds out from the questions. An upload over the limit arrives already cut,
 * with a line saying it was.
 *
 * **Language is said up front.** Only English and Albanian are accepted, and questions come
 * out in the material's own language — the hint under the label says both, so nobody pastes a
 * German article and learns the rule from an error. Uploads are checked on read; pasted text
 * is checked when Generate is pressed, before anything is spent.
 */
const SourceField = ({
  sourceData,
  onSourceDataChange,
  disabled,
  error,
  onUploadFile,
  isReadingFile,
  sourceFile,
  uploadError,
}: Pick<
  GenerationInputProps,
  | "sourceData"
  | "onSourceDataChange"
  | "disabled"
  | "error"
  | "onUploadFile"
  | "isReadingFile"
  | "sourceFile"
  | "uploadError"
>) => {
  // A DOM handle for the hidden <input type="file">, not state: the button only forwards a click.
  const fileInput = useRef<HTMLInputElement>(null);
  const locked = disabled || isReadingFile;
  const max = AI_QUESTION_LIMITS.maxSourceChars;
  const nearLimit = sourceData.length >= max * 0.9;

  const takeFile = (file: File | undefined) => {
    if (file && onUploadFile && !locked) onUploadFile(file);
  };

  return (
    <div>
      <RequiredEyebrow />
      <Label htmlFor="ai-source" className="mt-0.5 block text-xl font-medium short:text-lg">
        Your material
      </Label>
      <p id="ai-source-hint" className="text-muted-foreground text-xs mt-0.5">
        In English or Albanian — the questions are written in the same language.
      </p>
      <div
        className="relative"
        // Dropping a file on the box reads it like the button does. preventDefault on dragover
        // is what makes the box a drop target at all; without it the browser opens the file.
        onDragOver={(e) => {
          if (onUploadFile && e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!onUploadFile) return;
          e.preventDefault();
          takeFile(e.dataTransfer.files[0]);
        }}
      >
        <Textarea
          id="ai-source"
          variant="settings"
          className={cn(
            "mt-1 min-h-[180px] short:min-h-[132px]",
            error && "border-destructive focus-visible:ring-destructive/40",
          )}
          placeholder={
            onUploadFile
              ? "Paste notes, an article, a transcript — or drop a file here..."
              : "Paste notes, an article, a transcript..."
          }
          value={sourceData}
          maxLength={max}
          onChange={(e) => onSourceDataChange(e.target.value)}
          disabled={locked}
          aria-invalid={Boolean(error)}
          aria-describedby={["ai-source-hint", "ai-source-count", error && "ai-input-error"]
            .filter(Boolean)
            .join(" ")}
        />
        {isReadingFile && (
          <div className="absolute inset-0 mt-1 flex items-center justify-center gap-2 rounded-md bg-background/70 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Reading your file…
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        {onUploadFile ? (
          <div className="flex min-w-0 items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_FILES}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                takeFile(e.target.files?.[0]);
                // Cleared so choosing the same file again (after editing it) fires a change.
                e.target.value = "";
              }}
            />
            <LiftedButton
              type="button"
              size="sm"
              className="bg-muted text-foreground"
              liftColor="muted-foreground"
              outerClassName="shrink-0"
              disabled={locked}
              onClick={() => fileInput.current?.click()}
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload a file
            </LiftedButton>
            <span className="truncate text-xs text-muted-foreground">
              PDF, Word or text, up to 10 MB
            </span>
          </div>
        ) : (
          <span />
        )}
        <span
          id="ai-source-count"
          className={cn(
            "shrink-0 text-xs tabular-nums",
            nearLimit ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground",
          )}
        >
          {numberFormat.format(sourceData.length)} / {numberFormat.format(max)}
        </span>
      </div>

      {sourceFile && sourceData.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          Read from <span className="font-medium text-foreground">{sourceFile.name}</span>.
          {" "}Questions will be in {sourceFile.language}.
        </p>
      )}
      {sourceFile?.truncated && sourceData.length > 0 && (
        <p className="text-amber-600 dark:text-amber-500 text-xs mt-1 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          The file was longer than {numberFormat.format(max)} characters, so only the start was kept.
        </p>
      )}
      {uploadError && (
        <p role="alert" className="text-destructive text-xs mt-1.5 flex items-start gap-1">
          {/* Aligned to the first line: this message often wraps to three on a phone. */}
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          {uploadError}
        </p>
      )}
      <FieldError error={error} />
    </div>
  );
};
