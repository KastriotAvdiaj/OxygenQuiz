import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/Api-client";

/** One stored image or audio clip — `MediaAssetDTO` on the API (docs/media/media-pipeline.md). */
export type MediaAsset = {
  id: string;
  kind: "Image" | "Audio";
  url: string;
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  byteSize: number;
  /** Set for Pexels / Wikimedia images, whose credit must be shown wherever they render. */
  credit?: MediaCredit | null;
};

export type MediaCredit = {
  provider: string;
  /** The one-line credit every screen shows ("Photo: Jane Doe / Pexels") — `MediaCredits.Line`. */
  line: string;
  author?: string | null;
  authorUrl?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
};

/**
 * The credit as every screen shows it: one line, linked to the image's page at its source. A saved
 * question or quiz carries exactly this (`mediaCredit` / `mediaCreditUrl`, `coverCredit` /
 * `coverCreditUrl`), so a fresh pick and a saved one render the same.
 */
export type CreditLine = { line: string; url?: string | null };

export const creditLineOf = (credit: MediaCredit | null | undefined): CreditLine | null =>
  credit?.line ? { line: credit.line, url: credit.sourceUrl ?? null } : null;

/** A saved question's or quiz's credit fields as a `CreditLine`, or null when there is none. */
export const creditFrom = (line: string | null | undefined, url?: string | null): CreditLine | null =>
  line ? { line, url: url ?? null } : null;

/**
 * What an editor holds for a question's or quiz's media: the asset id it will send on save, and
 * what it needs to show a preview. Only `assetId` goes to the API — the server writes the URL and
 * the credit.
 */
export type MediaSelection = {
  assetId: string;
  url: string;
  kind: "Image" | "Audio";
  credit?: CreditLine | null;
};

export const toSelection = (asset: MediaAsset): MediaSelection => ({
  assetId: asset.id,
  url: asset.url,
  kind: asset.kind,
  credit: creditLineOf(asset.credit),
});

/**
 * Builds the selection an edit form starts from, out of a saved question's DTO fields. Null when
 * there's no media — or when the row predates the pipeline and has a URL but no asset id, which
 * can't be sent back.
 */
export const selectionFrom = (
  assetId: string | null | undefined,
  url: string | null | undefined,
  kind: string | null | undefined,
  creditLine?: string | null,
  creditUrl?: string | null,
): MediaSelection | null =>
  assetId && url && (kind === "Image" || kind === "Audio")
    ? { assetId, url, kind, credit: creditFrom(creditLine, creditUrl) }
    : null;

// Client-side guards mirror the API (MediaOptions: ImageMaxSourceBytes, AudioMaxBytes) for fast
// feedback. The API is the gate: it re-checks the size and decides the type from the bytes.
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;

/** Why a file can't be uploaded, judged before sending it — or null if it looks fine. */
export function precheckFile(file: File, allowAudio: boolean): string | null {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isAudio = AUDIO_TYPES.includes(file.type) || /\.(mp3|m4a|ogg)$/i.test(file.name);
  if (!isImage && !(allowAudio && isAudio)) {
    return allowAudio
      ? "Use a JPEG, PNG or WebP image, or an MP3, M4A or OGG clip."
      : "Use a JPEG, PNG or WebP image.";
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) return "Images can be up to 10 MB.";
  if (isAudio && file.size > MAX_AUDIO_BYTES) return "Audio clips can be up to 10 MB.";
  return null;
}

export async function uploadMedia(file: File): Promise<MediaAsset> {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<MediaAsset>("/media", form, {
    headers: { "Content-Type": "multipart/form-data" },
    // The picker shows the reason beside itself; a toast too would say it twice.
    skipErrorToast: true,
  });
  return response.data;
}

export const useUploadMedia = () => useMutation({ mutationFn: uploadMedia });

/** A form's media field: an asset id or nothing. The API checks the asset exists, isn't removed
 *  and fits the saver's quota; this only keeps a malformed value from being sent. */
export const mediaAssetIdSchema = z.string().uuid().nullable().optional();

/** A `MediaSelection` held in form state (the quiz cover, the builder's questions). Only its
 *  `assetId` is ever sent. */
export const mediaSelectionSchema = z.object({
  assetId: z.string().uuid(),
  url: z.string(),
  kind: z.enum(["Image", "Audio"]),
  credit: z.object({ line: z.string(), url: z.string().nullable().optional() }).nullable().optional(),
});
