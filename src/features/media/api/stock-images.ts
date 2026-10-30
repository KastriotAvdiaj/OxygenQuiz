import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import type { MediaAsset } from "./upload-media";

/**
 * Pexels and Wikimedia Commons, searched through our API (docs/media/media-pipeline.md, "Outside
 * sources"). The import names an image by provider and id only — the server finds the file and
 * its credit itself, so nothing here can choose what the server downloads or what licence it claims.
 */

export type StockProviderId = "wikimedia" | "pexels";

export type StockProvider = { id: StockProviderId; name: string; enabled: boolean };

export type StockImage = {
  provider: StockProviderId;
  id: string;
  /** A small preview served by the source; the picker shows it, nothing stores it. */
  thumbUrl: string;
  width: number;
  height: number;
  title?: string | null;
  author?: string | null;
  license?: string | null;
};

export type StockSearchPage = { items: StockImage[]; page: number; hasMore: boolean };

/** Mirrors StockImageService.MaxQueryLength. */
export const MAX_STOCK_QUERY = 100;

export const stockKeys = {
  all: ["media", "stock"] as const,
  providers: () => [...stockKeys.all, "providers"] as const,
  search: (provider: StockProviderId, q: string) => [...stockKeys.all, "search", provider, q] as const,
};

export const useStockProviders = (enabled = true) =>
  useQuery({
    queryKey: stockKeys.providers(),
    queryFn: () => api.get<StockProvider[]>("/media/stock/providers").then((r) => r.data),
    staleTime: Infinity, // a site setting; it doesn't change under an open editor
    enabled,
    // A failure here only means no source switch; it mustn't take the editor down.
    throwOnError: false,
  });

export const useStockSearch = (provider: StockProviderId, q: string) =>
  useInfiniteQuery({
    queryKey: stockKeys.search(provider, q),
    queryFn: ({ pageParam }) =>
      api
        .get<StockSearchPage>("/media/stock/search", {
          params: { provider, q, page: pageParam },
          // The dialog shows the reason in place (a source that's busy, a bad query).
          skipErrorToast: true,
        })
        .then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore && last.page < 20 ? last.page + 1 : undefined),
    enabled: q.trim().length > 0,
    staleTime: 5 * 60_000,
    // A busy or switched-off source is normal (Commons throttles, Pexels may have no key): the
    // dialog says so in place. The app default would throw to the error boundary and replace the
    // whole editor — unsaved quiz included — with "Something went wrong".
    throwOnError: false,
  });

export const useImportStockImage = () =>
  useMutation({
    mutationFn: (image: Pick<StockImage, "provider" | "id">) =>
      api
        .post<MediaAsset>("/media/stock/import", { provider: image.provider, id: image.id }, { skipErrorToast: true })
        .then((r) => r.data),
  });
