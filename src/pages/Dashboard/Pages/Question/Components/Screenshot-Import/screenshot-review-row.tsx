import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { rowProblems, typesFor, type ReviewRow } from "./review-model";

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
}

/**
 * One question read from a screenshot, in the review list (docs/quiz/screenshot-import.md). Its
 * badges say where each part came from — *Answer from the image* or *Suggested — check* — so the
 * reviewer knows which answers to look at hardest. A picture-is-the-question row is shown greyed
 * out and can't be kept: it needs two images, which isn't supported yet.
 */
export const ScreenshotReviewRow = ({
  row,
  categories,
  difficulties,
  languages,
  onChange,
}: ScreenshotReviewRowProps) => {
  const problems = row.keep ? rowProblems(row) : [];
  const disabled = row.needsItsPicture;
  const suggested = !row.answerFromImage || (row.type === QuestionType.MultipleChoice && !row.optionsFromImage);

  return (
    <li
      className={cn(
        "flex gap-3 rounded-md border bg-card p-3 dark:border-foreground/30",
        disabled && "opacity-60",
      )}
    >
      <Checkbox
        className="mt-1"
        checked={row.keep}
        disabled={disabled}
        onCheckedChange={(checked) => onChange({ keep: checked === true })}
        aria-label={row.keep ? "Keep this question" : "Skip this question"}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">Image {row.imageNumber}</span>
          {disabled ? (
            <Badge tone="muted">Needs its picture — not supported yet</Badge>
          ) : suggested ? (
            <Badge tone="warning">
              {row.answerFromImage ? "Options suggested — check" : "Answer suggested — check"}
            </Badge>
          ) : (
            <Badge tone="success">Answer from the image</Badge>
          )}
          {row.duplicateOfId !== null && (
            <Badge tone="danger">Possible duplicate of #{row.duplicateOfId}</Badge>
          )}
          {row.imageQuery && !disabled && <Badge tone="muted">Picture idea: {row.imageQuery}</Badge>}
        </div>

        <Input
          variant="settings"
          value={row.text}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
          aria-label="Question"
        />

        {!disabled && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
              <Select
                value={row.type}
                onValueChange={(value) => onChange({ type: value as QuestionType })}
                disabled={typesFor(row).length === 1}
              >
                <SelectTrigger className="h-9 min-w-[160px] text-sm" aria-label="Question type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typesFor(row).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {row.type === QuestionType.TrueFalse ? (
                <Select
                  value={row.correctAnswer}
                  onValueChange={(value) => onChange({ correctAnswer: value })}
                >
                  <SelectTrigger className="h-9 text-sm" aria-label="Answer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  variant="settings"
                  value={row.correctAnswer}
                  onChange={(e) => onChange({ correctAnswer: e.target.value })}
                  aria-label="Answer"
                  placeholder="The answer"
                />
              )}
            </div>

            {row.type === QuestionType.MultipleChoice && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {row.wrongOptions.map((option, i) => (
                  <Input
                    key={i}
                    variant="settings"
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
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CategorySelect
                categories={categories}
                value={row.categoryId?.toString() ?? ""}
                onChange={(v) => onChange({ categoryId: parseInt(v, 10) })}
                includeAllOption={false}
              />
              <DifficultySelect
                difficulties={difficulties}
                value={row.difficultyId?.toString() ?? ""}
                onChange={(v) => onChange({ difficultyId: parseInt(v, 10) })}
                includeAllOption={false}
              />
              <LanguageSelect
                languages={languages}
                value={row.languageId?.toString() ?? ""}
                onChange={(v) => onChange({ languageId: parseInt(v, 10) })}
                includeAllOption={false}
              />
              <Select
                value={row.visibility}
                onValueChange={(value) => onChange({ visibility: value as ReviewRow["visibility"] })}
              >
                <SelectTrigger className="h-9 text-sm" aria-label="Visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {problems.length > 0 && (
          <p className="text-xs text-destructive">{problems.join(" · ")}</p>
        )}
      </div>
    </li>
  );
};

const TONES = {
  success: "bg-green-500/10 text-green-700 dark:text-green-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-700 dark:text-red-400",
  muted: "bg-muted text-muted-foreground",
} as const;

const Badge = ({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) => (
  <span className={cn("rounded-sm px-1.5 py-0.5 font-medium", TONES[tone])}>{children}</span>
);
