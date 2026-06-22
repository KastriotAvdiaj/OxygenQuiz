import { cn } from "@/utils/cn";
import type { QuestionMediaType } from "@/types/question-types";

interface QuestionMediaProps {
  /** Absolute URL of the attachment (already includes the API origin). */
  mediaUrl?: string | null;
  /** What to render. Defaults to an image when a URL exists but the type is missing/None,
   *  so legacy image-only questions (which only carry a URL) still display. */
  mediaType?: QuestionMediaType | null;
  alt?: string;
  className?: string;
}

/**
 * Renders a question's optional media attachment (image / audio / video) based on its type.
 * Returns `null` when there's nothing to show, so callers can drop it in unconditionally.
 *
 * Shared across the quiz-taking screens so every place that shows a question renders media the
 * same way. Image is the common case today; audio/video are handled for parity with the backend.
 */
export function QuestionMedia({
  mediaUrl,
  mediaType,
  alt = "Question media",
  className,
}: QuestionMediaProps) {
  if (!mediaUrl) return null;

  // A URL with no explicit (or "None") type is a legacy image-only question.
  const kind: QuestionMediaType =
    mediaType && mediaType !== "None" ? mediaType : "Image";

  if (kind === "Audio") {
    return (
      <audio
        controls
        src={mediaUrl}
        className={cn("mx-auto w-full max-w-md", className)}
      />
    );
  }

  if (kind === "Video") {
    return (
      <video
        controls
        src={mediaUrl}
        className={cn(
          "mx-auto max-h-72 w-full rounded-xl border-2 border-primary/20 bg-background object-contain",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-fit max-w-full overflow-hidden rounded-xl border-2 border-primary/20 bg-background p-1.5",
        className
      )}
    >
      <img
        src={mediaUrl}
        alt={alt}
        loading="lazy"
        className="mx-auto max-h-64 w-auto rounded-lg object-contain"
      />
    </div>
  );
}

export default QuestionMedia;
