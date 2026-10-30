import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { toSelection, type MediaAsset } from "@/features/media/api/upload-media";
import type { ParsedQuestion, ParseResult } from "./parse-ai-output";

/**
 * The pictures an AI-written quiz asked for (docs/media/media-pipeline.md, "AI-added images").
 *
 * Each question the model gave an `imageQuery` is sent to `POST /api/media/stock/auto`, where our
 * code searches Wikimedia Commons (then Pexels), keeps only reusable licences, and imports the best
 * result like an upload — the model proposes a phrase, the code decides the image (ADR 0003).
 *
 * <b>A query, not a mutation.</b> The import is idempotent (the same bytes are one asset), its result
 * is the asset for that phrase, and React Query gives the parallel requests, de-duplication and
 * caching for free — so re-rendering the review, or reopening it, asks again for nothing. Never
 * `throwOnError`: a picture that couldn't be found is a note on the review, not a crash.
 */
export const autoImageKey = (query: string) => ["media", "auto-image", query.toLowerCase()] as const;

export type AutoImages = {
  /** Questions to hand the builder — with `media` filled in where a picture was found. */
  questions: ParsedQuestion[];
  /** How many pictures were asked for, and how many have settled. */
  requested: number;
  settled: number;
  /** 1-based positions of the questions that asked for a picture and got none. */
  notFound: number[];
  /** True while any picture is still being looked for — and the author hasn't chosen to go on. */
  pending: boolean;
  /** Go to the review now, with whatever has arrived. */
  skip: () => void;
};

export const useAutoImages = (result: ParseResult | null): AutoImages => {
  const parsed = result?.ok ? result.questions : [];
  const wanted = parsed.map((q, i) => ({ query: q.imageQuery, index: i })).filter((w): w is { query: string; index: number } => !!w.query);
  const [skipped, setSkipped] = useState(false);

  const answers = useQueries({
    queries: wanted.map((w) => ({
      queryKey: autoImageKey(w.query),
      queryFn: () =>
        api
          .post<MediaAsset>("/media/stock/auto", { query: w.query }, { skipErrorToast: true })
          .then((r) => r.data),
      staleTime: Infinity,
      gcTime: 30 * 60_000,
      retry: false,
      throwOnError: false,
      enabled: !skipped,
    })),
  });

  const found = new Map<number, MediaAsset>();
  const notFound: number[] = [];
  answers.forEach((a, k) => {
    if (a.data) found.set(wanted[k].index, a.data);
    else if (a.isError || skipped) notFound.push(wanted[k].index + 1);
  });

  const questions = parsed.map((q, i) => {
    const asset = found.get(i);
    return asset && asset.kind === "Image" ? { ...q, question: { ...q.question, media: toSelection(asset) } } : q;
  });

  const settled = answers.filter((a) => !a.isPending).length;
  return {
    questions,
    requested: wanted.length,
    settled,
    notFound,
    pending: !skipped && settled < wanted.length,
    skip: () => setSkipped(true),
  };
};
