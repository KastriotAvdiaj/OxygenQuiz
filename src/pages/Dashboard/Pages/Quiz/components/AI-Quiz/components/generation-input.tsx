import { AlertTriangle } from "lucide-react";

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
 */
export const GenerationInput = ({
  mode,
  topic,
  onTopicChange,
  sourceData,
  onSourceDataChange,
  disabled,
  error,
}: GenerationInputProps) => (
  <>
    {mode === "Topic" ? (
      <div>
        <Label htmlFor="ai-topic" className="text-sm font-medium">
          What should this quiz be about?
        </Label>
        <Input
          id="ai-topic"
          variant="minimal"
          className={cn("mt-1 text-base", error && "minimal-input--error")}
          placeholder="Type your topic here..."
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "ai-input-error" : undefined}
        />
        {/* Topic mode has no source to ground it, so the model is recalling facts. Saying so
            here — not only in the review banner — sets the expectation before they commit. */}
        {/* <p className="text-muted-foreground text-xs mt-1.5">
          Written from the AI's own knowledge, so check the facts when you
          review.
        </p> */}
        <FieldError error={error} />
      </div>
    ) : (
      <div>
        <Label htmlFor="ai-source" className="text-sm font-medium">
          Your material
        </Label>
        <Textarea
          id="ai-source"
          variant="settings"
          className={cn(
            "mt-1 min-h-[180px]",
            error && "border-destructive focus-visible:ring-destructive/40",
          )}
          placeholder="Paste notes, an article, a transcript..."
          value={sourceData}
          onChange={(e) => onSourceDataChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "ai-input-error" : undefined}
        />
        {sourceData.length > AI_QUESTION_LIMITS.sourceWarningLength && (
          <p className="text-amber-600 dark:text-amber-500 text-xs mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            That's very long — we'll use the first part of it.
          </p>
        )}
        <FieldError error={error} />
      </div>
    )}
  </>
);
