import { AxiosResponse } from "axios";
import { Pagination } from "@/types/ApiTypes";

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
      typeof p.hasNextPage === "boolean" &&
      typeof p.hasPreviousPage === "boolean"
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