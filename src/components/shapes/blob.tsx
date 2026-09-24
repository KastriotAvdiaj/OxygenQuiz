import { cn } from "@/utils/cn";
import type { BlobShape } from "./blob-shapes";

export { BLOB_A, BLOB_B, BLOB_C, BLOB_D } from "./blob-shapes";

/**
 * One filled, roughly circular blob in the theme's primary colour, for a page's background
 * layer — the decorative sibling of the landing page's wave
 * (docs/development/decorative-shapes.md).
 *
 * Position and size it with `className` (`absolute` is built in; give it `top-`/`left-`/…
 * and a `w-`). It scales uniformly from its width, so it stays round. Put blobs in an
 * `absolute inset-0 overflow-hidden` layer as the page root's *first* child, with the page's
 * content in a later `relative` element, so the content paints above them.
 *
 * Keep them out from under text and primary-coloured UI: muted text is unreadable on primary,
 * and the app's loader *is* primary, so over a blob it disappears.
 */
export function Blob({ shape, className }: { shape: BlobShape; className?: string }) {
  return (
    <svg
      viewBox={shape.viewBox}
      aria-hidden="true"
      focusable="false"
      className={cn(
        "pointer-events-none absolute h-auto fill-primary",
        "animate-in fade-in-0 zoom-in-75 duration-700 ease-out motion-reduce:animate-none",
        className,
      )}
    >
      <path d={shape.d} />
    </svg>
  );
}
