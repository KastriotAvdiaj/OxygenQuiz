import { Pagination } from "@/types/common-types";
import { PagedResponse } from "@/lib/filtering/types";
import { AxiosResponse } from "axios";

// Adapts the filtering framework's body envelope to the legacy `Pagination` shape used by
// PaginationControls, so existing list UIs can consume framework endpoints unchanged.
export function pagedResponseToPagination<T>(
  response: PagedResponse<T>
): Pagination {
  return {
    currentPage: response.page,
    itemsPerPage: response.pageSize,
    totalItems: response.totalItems,
    totalPages: response.totalPages,
    hasNextPage: response.hasNextPage,
    hasPreviousPage: response.hasPreviousPage,
  };
}

export function extractPaginationFromHeaders(
  response: AxiosResponse
): Pagination | null {
  const raw = response.headers["pagination"];
  if (!raw || typeof raw !== "string") return null;

  try {
    const p = JSON.parse(raw);
    if (
      typeof p.currentPage === "number" &&
      typeof p.itemsPerPage === "number" &&
      typeof p.totalItems === "number" &&
      typeof p.totalPages === "number" &&
      typeof p.hasPreviousPage === "boolean" &&
      typeof p.hasNextPage === "boolean"
    ) {
      return p;
    }
  } catch {
    // ignore parse errors
    console.error("Failed to parse pagination header", raw);
  }
  return null;
}

export function cleanQueryParams(
  params: Record<string, any> = {}
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  );
}