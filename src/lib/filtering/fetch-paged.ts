import { api } from "@/lib/Api-client";
import { buildFilterQueryString } from "./filter-builder";
import type { FilterQuery, PagedResponse } from "./types";

/**
 * Generic fetch for any endpoint that speaks the filtering framework: serializes the
 * FilterQuery, calls the endpoint, and returns the PagedResponse body envelope.
 * Pagination metadata is in the body (no header parsing needed).
 *
 * Example:
 *   fetchPaged<QuestionBase>("/questions/search", {
 *     filters: [rule.eq("userId", id), rule.between("createdAt", from, to)],
 *     sort: [sortBy("createdAt", "desc")],
 *     page: 1, pageSize: 20,
 *   });
 */
export async function fetchPaged<T>(
  url: string,
  query: FilterQuery,
  /** Endpoint-specific parameters beside the filter query (e.g. the catalogue's `scope`). */
  params?: Record<string, string | undefined>
): Promise<PagedResponse<T>> {
  const result = await api.get(`${url}${buildFilterQueryString(query)}`, params ? { params } : undefined);
  return result.data as PagedResponse<T>;
}
