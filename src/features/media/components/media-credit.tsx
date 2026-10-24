import { cn } from "@/utils/cn";
import type { CreditLine } from "../api/upload-media";

/**
 * "Photo: Jane Doe / Pexels" — the credit a Pexels or Wikimedia image must carry wherever it is
 * shown. Not optional: Wikimedia's CC licences require it by law, and Pexels makes it a condition of
 * API access (docs/media/media-pipeline.md, "Outside sources"). The line links to the image's page
 * at its source, which names the author and licence in full; it opens in a new tab without telling
 * the source who sent the visitor.
 */
export function MediaCreditLine({ credit, className }: { credit: CreditLine; className?: string }) {
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      {credit.url ? (
        <a href={credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {credit.line}
        </a>
      ) : (
        credit.line
      )}
    </p>
  );
}
