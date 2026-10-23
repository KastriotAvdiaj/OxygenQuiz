import { cn } from "@/utils/cn";
import type { MediaCredit } from "../api/upload-media";

/**
 * "Photo: Jane Doe / Pexels" — the credit a Pexels or Wikimedia image must carry wherever it is
 * shown. Not optional: Wikimedia's CC licences require it by law, and Pexels makes it a condition of
 * API access (docs/media/media-pipeline.md, "Image sources"). The author and the provider link to
 * their pages; both open in a new tab without passing on who sent the visitor.
 */
export function MediaCreditLine({ credit, className }: { credit: MediaCredit; className?: string }) {
  const author = credit.author?.trim();
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      {"Photo: "}
      {author &&
        (credit.authorUrl ? (
          <a href={credit.authorUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            {author}
          </a>
        ) : (
          author
        ))}
      {author && " / "}
      {credit.sourceUrl ? (
        <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {credit.provider}
        </a>
      ) : (
        credit.provider
      )}
      {credit.license &&
        (credit.licenseUrl ? (
          <>
            {" · "}
            <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              {credit.license}
            </a>
          </>
        ) : (
          ` · ${credit.license}`
        ))}
    </p>
  );
}
