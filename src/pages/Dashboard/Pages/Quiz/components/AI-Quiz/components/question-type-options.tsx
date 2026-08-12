import { QuestionType } from "@/types/question-types";

/**
 * The types the wizard offers, in display order. Also the container's initial selection
 * (everything on), so the order the chips render in is the order the prompt lists them.
 */
export const ALL_AI_QUESTION_TYPES = [
  QuestionType.MultipleChoice,
  QuestionType.TrueFalse,
  QuestionType.TypeTheAnswer,
] as const;

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "Multiple Choice",
  [QuestionType.TrueFalse]: "True / False",
  [QuestionType.TypeTheAnswer]: "Type The Answer",
};

export interface QuestionTypeChipsProps {
  selected: QuestionType[];
  onToggle: (type: QuestionType) => void;
}

/** Multi-select chips for the question types the model may use. At least one is required. */
export const QuestionTypeChips = ({ selected, onToggle }: QuestionTypeChipsProps) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {ALL_AI_QUESTION_TYPES.map((type) => {
      const active = selected.includes(type);
      return (
        <button
          key={type}
          type="button"
          aria-pressed={active}
          onClick={() => onToggle(type)}
          className={`text-xs rounded-full px-3 py-1 border-2 transition-colors ${
            active
              ? "border-primary bg-primary/15 text-primary font-medium"
              : "border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          {QUESTION_TYPE_LABELS[type]}
        </button>
      );
    })}
  </div>
);
