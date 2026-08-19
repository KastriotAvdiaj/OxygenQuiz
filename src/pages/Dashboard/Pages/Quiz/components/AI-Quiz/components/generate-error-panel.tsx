import { AlertTriangle } from "lucide-react";

import type { AiGenerateError } from "../../../api/generate-ai-quiz";

/**
 * What to say, and what to offer, for each failure code.
 *
 * The codes are a closed set the server owns (docs/quiz/ai-quiz-generation-flow.md §5), so
 * this is the client half of that contract: adding a code there means adding a case here.
 *
 * The "nothing was used" line is not reassurance for its own sake — a user who thinks a
 * failed attempt cost them one of two daily generations will stop pressing the button, and
 * the release path in `AiQuotaService` exists precisely so that fear is unfounded.
 */
export const GenerateErrorPanel = ({ error }: { error: AiGenerateError }) => {
  const retryable =
    error.code === "ProviderUnavailable" ||
    error.code === "ProviderTimeout" ||
    error.code === "ModelOutputInvalid" ||
    error.code === "Unknown";

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <p className="text-destructive text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        {error.message}
      </p>
      {retryable && (
        <p className="text-destructive/80 text-xs mt-1 pl-6">
          Nothing was used from your daily allowance — press Generate to try again.
        </p>
      )}
      {error.code === "QuotaExceeded" && error.retryAfter && (
        <p className="text-destructive/80 text-xs mt-1 pl-6">
          Resets {new Date(error.retryAfter).toLocaleString()}.
        </p>
      )}
    </div>
  );
};
