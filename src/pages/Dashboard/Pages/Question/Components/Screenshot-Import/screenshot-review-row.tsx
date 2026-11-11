import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label, Textarea } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Check, X } from "lucide-react";
import { MediaPicker } from "@/features/media/components/media-picker";
import { VisibilitySelect } from "../../Entities/select-visibility";
import { cn } from "@/utils/cn";
import {
  QuestionType,
  type QuestionCategory,
  type QuestionDifficulty,
  type QuestionLanguage,
} from "@/types/question-types";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import { DuplicatePreview } from "./duplicate-preview";
import { ALL_TYPES, needsStatement, rowProblems, type ReviewRow } from "./review-model";

const TYPE_LABEL: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "Multiple choice",
  [QuestionType.TrueFalse]: "True / False",
  [QuestionType.TypeTheAnswer]: "Type the answer",
};

export interface ScreenshotReviewRowProps {
  row: ReviewRow;
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  onChange: (patch: Partial<ReviewRow>) => void;
  /** Takes the row out of the list (its image stays). */
  onRemove: () => void;
}

/**
 * One question read from a screenshot, in the review list (docs/quiz/screenshot-import.md). Its
 * badges say where each part came from — *Answer from the image* or *Answer suggested — check* —
 * so the reviewer knows which answers to look at hardest. Every field is labelled and uses the
 * builder's own minimal fields, in the app font: the reviewer is editing the question as it will
 * be played. A picture-is-the-question row is shown greyed out and can't be kept.
 */
export const ScreenshotReviewRow = ({
  row,
  categories,
  difficulties,
  languages,
  onChange,
  onRemove,
}: ScreenshotReviewRowProps) => {
  const problems = row.keep ? rowProblems(row) : [];
  // A picture-is-the-question row waits for its picture: the screenshot's own isn't kept.
  const disabled = row.needsItsPicture && !row.media;
  const suggested =
    !row.answerFromImage || (row.type === QuestionType.MultipleChoice && !row.optionsFromImage);
  const id = `shot-${row.key}`;

  // The reviewer took the bank's question: one quiet line, with the way back.
  if (row.useExisting && row.duplicateOfId !== null)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-dashed bg-card px-3 py-2 text-sm dark:border-foreground/30">
        <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          Image {row.imageNumber}: using #{row.duplicateOfId} from the bank — “{row.text}” isn't saved
        </span>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => onChange({ useExisting: false })}
        >
          Undo
        </button>
      </div>
    );

  return (
    <div className="flex gap-3 rounded-md border bg-card p-3 dark:border-foreground/30">
      <Checkbox
        className="mt-1"
        checked={row.keep}
        disabled={disabled}
        onCheckedChange={(checked) => onChange({ keep: checked === true })}
        aria-label={row.keep ? "Keep this question" : "Skip this question"}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">Image {row.imageNumber}</span>
          {disabled ? (
            <Badge tone="warning">Needs its picture — add one below</Badge>
          ) : row.type === QuestionType.TrueFalse && row.seenType !== QuestionType.TrueFalse ? (
            <Badge tone="warning">Your statement — check the answer</Badge>
          ) : suggested ? (
            <Badge tone="warning">
              {row.answerFromImage ? "Options suggested — check" : "Answer suggested — check"}
            </Badge>
          ) : (
            <Badge tone="success">Answer from the image</Badge>
          )}
          {row.duplicateOfId !== null && (
            <DuplicatePreview
              questionId={row.duplicateOfId}
              onUseExisting={() => onChange({ useExisting: true, keep: false })}
              onSaveMine={() => onChange({ useExisting: false, keep: true })}
            />
          )}
          {row.alsoOnImage !== null && <Badge tone="danger">Also on image {row.alsoOnImage}</Badge>}
          {row.imageQuery && <Badge tone="muted">Picture idea: {row.imageQuery}</Badge>}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove this question from the list"
            className="ml-auto rounded p-0.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <Field label={needsStatement(row) ? "Statement — rewrite the question as one" : "Question"} htmlFor={`${id}-text`}>
          <Textarea
            id={`${id}-text`}
            variant="minimal"
            rows={1}
            className="w-full resize-none !max-h-40 leading-snug [field-sizing:content]"
            value={row.text}
            disabled={disabled}
            onChange={(e) => onChange({ text: e.target.value })}
            onKeyDown={(e) => {
              // One line of data, like the builder's question: Enter never inserts a newline.
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </Field>

        {/* Any row can take a picture; a picture-is-the-question row needs one before it can be
            kept. Uploading only stores it — the save attaches it (MediaPicker). */}
        <MediaPicker
          value={row.media}
          onChange={(media) =>
            onChange(
              row.needsItsPicture && media && !row.media ? { media, keep: true } : { media },
            )
          }
          className="mx-0 max-w-full sm:max-w-sm"
        />

        {!disabled && (
          <>
            {/* A select, not tabs: one row already carries a lot, and the type is set once. */}
            <Field label="Type">
              <Select value={row.type} onValueChange={(type) => onChange({ type: type as QuestionType })}>
                <SelectTrigger variant="minimal" aria-label="Question type" className="sm:max-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="minimal">
                  {ALL_TYPES.map((t) => (
                    <SelectItem variant="minimal" key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {row.type === QuestionType.TrueFalse ? (
              <Field label="Answer">
                <SegmentedControl
                  value={row.tfAnswer}
                  onValueChange={(tfAnswer) => onChange({ tfAnswer })}
                  options={[
                    { value: "true", label: "True" },
                    { value: "false", label: "False" },
                  ]}
                  aria-label="Answer"
                />
              </Field>
            ) : (
              <Field label="Answer" htmlFor={`${id}-answer`}>
                <Input
                  id={`${id}-answer`}
                  variant="minimal"
                  value={row.correctAnswer}
                  onChange={(e) => onChange({ correctAnswer: e.target.value })}
                  placeholder="The answer"
                />
              </Field>
            )}

            {row.type === QuestionType.MultipleChoice && (
              <Field label="Wrong options">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {row.wrongOptions.map((option, i) => (
                    <Input
                      key={i}
                      variant="minimal"
                      value={option}
                      placeholder={`Wrong option ${i + 1}`}
                      aria-label={`Wrong option ${i + 1}`}
                      onChange={(e) => {
                        const next = [...row.wrongOptions] as ReviewRow["wrongOptions"];
                        next[i] = e.target.value;
                        onChange({ wrongOptions: next });
                      }}
                    />
                  ))}
                </div>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="Category">
                <CategorySelect
                  categories={categories}
                  fieldVariant="minimal"
                  value={row.categoryId?.toString() ?? ""}
                  onChange={(v) => onChange({ categoryId: parseInt(v, 10) })}
                  includeAllOption={false}
                />
              </Field>
              <Field label="Difficulty">
                <DifficultySelect
                  difficulties={difficulties}
                  fieldVariant="minimal"
                  value={row.difficultyId?.toString() ?? ""}
                  onChange={(v) => onChange({ difficultyId: parseInt(v, 10) })}
                  includeAllOption={false}
                />
              </Field>
              <Field label="Language">
                <LanguageSelect
                  languages={languages}
                  fieldVariant="minimal"
                  value={row.languageId?.toString() ?? ""}
                  onChange={(v) => onChange({ languageId: parseInt(v, 10) })}
                  includeAllOption={false}
                />
              </Field>
              <Field label="Visibility">
                <VisibilitySelect
                  value={row.visibility}
                  onChange={(value) => onChange({ visibility: value as ReviewRow["visibility"] })}
                />
              </Field>
            </div>
          </>
        )}

        {row.duplicateOfId !== null && !row.keep && (
          <p className="text-xs text-muted-foreground">
            Unticked: it looks like #{row.duplicateOfId}, already in the bank — open the badge to compare.{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => onChange({ useExisting: true })}
            >
              Use #{row.duplicateOfId}
            </button>{" "}
            or{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => onChange({ keep: true })}
            >
              save mine too
            </button>
            .
          </p>
        )}
        {problems.length > 0 && <p className="text-xs text-destructive">{problems.join(" · ")}</p>}
      </div>
    </div>
  );
};

/** A small quiet heading over a field — what each box is, without reading like a settings form. */
const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) => (
  // A column, not space-y: a label beside an inline-flex control (the segmented ones) would sit on
  // the same line as it, with no gap.
  <div className="flex min-w-0 flex-col items-start gap-1 [&>*:last-child]:w-full">
    <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

const TONES = {
  success: "bg-green-500/10 text-green-700 dark:text-green-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-700 dark:text-red-400",
  muted: "bg-muted text-muted-foreground",
} as const;

const Badge = ({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) => (
  <span className={cn("rounded-sm px-1.5 py-0.5 font-medium", TONES[tone])}>{children}</span>
);
