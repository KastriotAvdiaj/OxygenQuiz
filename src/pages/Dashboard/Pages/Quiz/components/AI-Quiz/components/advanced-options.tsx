import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
  QuestionType,
} from "@/types/question-types";

import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";
import { AI_QUESTION_LIMITS } from "../prompt";
import { QuestionTypeChips } from "./question-type-chips";

export interface AdvancedOptionsProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];

  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  /** null means "let the AI suggest it" — the whole point of the disclosure. */
  categoryId: number | null;
  onCategoryIdChange: (id: number) => void;
  languageId: number | null;
  onLanguageIdChange: (id: number) => void;
  difficultyId: number | null;
  onDifficultyIdChange: (id: number) => void;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  allowedTypes: QuestionType[];
  onToggleType: (type: QuestionType) => void;
  extraInstructions: string;
  onExtraInstructionsChange: (value: string) => void;
}

/**
 * Everything the AI would otherwise decide, folded away.
 *
 * Collapsed by default and *stays* optional: an untouched field is a field the model fills
 * in and the user confirms at review. Anything set here is an instruction instead — the
 * container stops offering that vocabulary to the model entirely, so it can't overrule a
 * choice the human already made. See docs/quiz/ai-quiz-generation-flow.md §1a.
 *
 * Open/closed is local state, not a prop: it's presentation, nothing outside cares, and
 * lifting it would put a disclosure triangle in the container's state.
 */
export const AdvancedOptions = ({
  categories,
  difficulties,
  languages,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  categoryId,
  onCategoryIdChange,
  languageId,
  onLanguageIdChange,
  difficultyId,
  onDifficultyIdChange,
  questionCount,
  onQuestionCountChange,
  allowedTypes,
  onToggleType,
  extraInstructions,
  onExtraInstructionsChange,
}: AdvancedOptionsProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <span>Advanced — title, category, language, difficulty</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-3">
          <p className="text-muted-foreground text-xs">
            Leave these alone and the AI fills them in — you'll confirm everything in the
            next step.
          </p>

          <div>
            <Label htmlFor="ai-title" className="text-sm font-medium">
              Quiz title
            </Label>
            <Input
              id="ai-title"
              variant="settings"
              className="mt-1"
              placeholder="The AI will suggest one"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="ai-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="ai-description"
              variant="settings"
              className="mt-1 min-h-[60px] resize-none"
              placeholder="Optional"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>

          <Separator className="bg-primary/20" />

          <div className="space-y-3">
            <CategorySelect
              categories={categories}
              fieldVariant="minimal"
              value={categoryId?.toString() ?? ""}
              onChange={(v: string) => onCategoryIdChange(parseInt(v, 10))}
              includeAllOption={false}
            />
            <LanguageSelect
              languages={languages}
              fieldVariant="minimal"
              value={languageId?.toString() ?? ""}
              onChange={(v: string) => onLanguageIdChange(parseInt(v, 10))}
              includeAllOption={false}
            />
            <DifficultySelect
              difficulties={difficulties}
              fieldVariant="minimal"
              value={difficultyId?.toString() ?? ""}
              onChange={(v: string) => onDifficultyIdChange(parseInt(v, 10))}
              includeAllOption={false}
            />
          </div>

          <Separator className="bg-primary/20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ai-count" className="text-sm font-medium">
                Number of questions
              </Label>
              <Input
                id="ai-count"
                type="number"
                variant="settings"
                className="mt-1"
                min={AI_QUESTION_LIMITS.minQuestions}
                max={AI_QUESTION_LIMITS.maxGeneratedQuestions}
                value={questionCount}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  // Ignore rather than clamp-to-zero: an empty box mid-edit parses as NaN,
                  // and rewriting it to 1 under the user's cursor is worse than doing nothing.
                  if (Number.isNaN(n)) return;
                  onQuestionCountChange(n);
                }}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Question types</Label>
              <QuestionTypeChips selected={allowedTypes} onToggle={onToggleType} />
            </div>
          </div>

          <div>
            <Label htmlFor="ai-extra" className="text-sm font-medium">
              Extra instructions{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ai-extra"
              variant="settings"
              className="mt-1"
              placeholder="e.g. focus on dates, keep it exam-style..."
              value={extraInstructions}
              onChange={(e) => onExtraInstructionsChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
