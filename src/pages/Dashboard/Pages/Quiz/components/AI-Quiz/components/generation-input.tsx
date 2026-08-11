import { AlertTriangle, FileText, Wand2 } from "lucide-react";

import { Input, Label, Textarea } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils/cn";

import type { AiGenerationMode } from "../../../api/generate-ai-quiz";
import { AI_QUESTION_LIMITS } from "../prompt";

/**
 * Where the quiz comes from. Rendered in the card's header strip rather than alongside the
 * fields, matching the quiz-details panel in `create-quiz.tsx` — the tabs are a heading for
 * the panel, not another control inside it.
 *
 * Full width with `flex-1` triggers, so the two options split the strip evenly instead of
 * huddling at the left edge.
 */
export const GenerationModeTabs = ({
  mode,
  onModeChange,
}: {
  mode: AiGenerationMode;
  onModeChange: (mode: AiGenerationMode) => void;
}) => (
  <Tabs
    value={mode}
    onValueChange={(value) => onModeChange(value as AiGenerationMode)}
    className="w-full"
  >
    {/* The header already provides the tinted background, so the list drops its own track
        border and shadow — same treatment as the manual builder's panel. */}
    <TabsList className="w-full border-none shadow-none rounded-md">
      <TabsTrigger value="Topic" className="flex-1 rounded-xl">
        <span className="flex gap-2 px-2 items-center justify-center text-sm">
          <Wand2 className="h-4 w-4" />
          From a topic
        </span>
      </TabsTrigger>
      <TabsTrigger value="Source" className="flex-1 rounded-xl">
        <span className="flex gap-2 px-2 items-center justify-center text-sm">
          <FileText className="h-4 w-4" />
          From my material
        </span>
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

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
 * The one box: pick where the quiz comes from, then say what it's about.
 *
 * Topic and source are two shapes of the same question, so they share a control rather than
 * living on separate wizard steps — the old two-step form was the thing that made this
 * feature feel like admin work.
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
