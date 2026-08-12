import { useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Copy } from "lucide-react";

import { Textarea } from "@/components/ui/form";
import { Spinner } from "@/components/ui";
import { cn } from "@/utils/cn";
import { WizardButton } from "./wizard-button";

import type { ParseResult } from "../parse-ai-output";

export interface CopyPasteFallbackProps {
  /**
   * Generation isn't available at all (kill switch, quota spent, unverified email). The
   * section opens itself and the wording changes from "or" to "instead" — when this is the
   * only path forward, hiding it behind a disclosure is user-hostile.
   */
  forced: boolean;
  /**
   * Already wrapped by the view's validation guard — it fails the same way Generate does,
   * because it builds the same request. Just call it.
   */
  onCopyPrompt: () => void;
  copied: boolean;
  isCopying: boolean;
  aiResponse: string;
  onAiResponseChange: (value: string) => void;
  onImport: () => void;
  /** Only the failure case is rendered here; a success switches the whole view to review. */
  parseResult: ParseResult | null;
}

/**
 * Copy a prompt into your own ChatGPT, paste the reply back.
 *
 * Kept permanently, not as a legacy path: it's free, it works when the provider is down or
 * the daily allowance is gone, and some people would rather spend their own subscription
 * than our budget. The prompt comes from `POST /api/quiz/ai-prompt`, so it is the *same*
 * prompt in-app generation sends — there is only one in the codebase (plan §5.1).
 */
export const CopyPasteFallback = ({
  forced,
  onCopyPrompt,
  copied,
  isCopying,
  aiResponse,
  onAiResponseChange,
  onImport,
  parseResult,
}: CopyPasteFallbackProps) => {
  const [open, setOpen] = useState(false);

  // Same rule as the Generate button: the action stays clickable and explains itself, rather
  // than greying out and leaving the user to work out which box is empty.
  const [showPasteError, setShowPasteError] = useState(false);
  const pasteMissing = aiResponse.trim().length === 0;
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const handleImportClick = () => {
    if (pasteMissing) {
      setShowPasteError(true);
      replyRef.current?.focus();
      return;
    }

    setShowPasteError(false);
    onImport();
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open || forced}
        className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground"
      >
        <span>{forced ? "Use your own AI instead" : "Or use your own AI (free)"}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open || forced ? "rotate-180" : ""}`}
        />
      </button>

      {(open || forced) && (
        <div className="mt-3 space-y-4">
          <div className="rounded-lg border-2 border-dashed border-primary/40 p-4">
            <p className="font-medium text-sm mb-1">1. Copy the prompt</p>
            <p className="text-muted-foreground text-xs mb-3">
              Paste it into ChatGPT, Claude, Gemini — whichever you use.
            </p>
            <WizardButton
              type="button"
              disabled={isCopying}
              onClick={onCopyPrompt}
            >
              <span className="flex items-center gap-2">
                {isCopying ? (
                  <>
                    <Spinner size="sm" /> Preparing…
                  </>
                ) : copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy prompt
                  </>
                )}
              </span>
            </WizardButton>
          </div>

          <div>
            <p className="font-medium text-sm mb-1">2. Paste the AI's reply</p>
            <Textarea
              ref={replyRef}
              variant="settings"
              className={cn(
                "min-h-[140px] font-mono text-xs",
                showPasteError &&
                  pasteMissing &&
                  "border-destructive focus-visible:ring-destructive/40",
              )}
              placeholder='{ "questions": [ ... ] }'
              value={aiResponse}
              onChange={(e) => onAiResponseChange(e.target.value)}
              aria-invalid={showPasteError && pasteMissing}
              aria-describedby={
                showPasteError && pasteMissing ? "ai-paste-error" : undefined
              }
            />

            {/* Derived, so it clears itself the moment anything is pasted. */}
            {showPasteError && pasteMissing && (
              <p
                id="ai-paste-error"
                role="alert"
                className="text-destructive text-xs mt-1.5 flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Paste the AI's reply here first.
              </p>
            )}

            {parseResult && !parseResult.ok && (
              <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-destructive text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {parseResult.error}
                </p>
                {parseResult.dropped.length > 0 && (
                  <ul className="text-destructive/90 text-xs mt-2 space-y-1 pl-6 list-disc">
                    {/* Capped at five: a reply where everything failed produces one reason per
                        question, and a wall of them buries the actual problem. */}
                    {parseResult.dropped.slice(0, 5).map((d) => (
                      <li key={d.index}>
                        Question {d.index}: {d.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <WizardButton type="button" onClick={handleImportClick}>
                <span className="flex items-center gap-1">
                  Review questions <ArrowRight className="h-4 w-4" />
                </span>
              </WizardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
