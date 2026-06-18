import { api } from "@/lib/Api-client";
import { buildFilterParams } from "@/lib/filtering/filter-builder";
import type { FilterQuery } from "@/lib/filtering/types";

// Mirrors QuizAPI's DataTransferController. One entity slug per list that supports
// export/import; the slug is the path segment used by /api/datatransfer/{entity}/...
export type TransferEntity =
  | "categories"
  | "difficulties"
  | "languages"
  | "users"
  | "questions"
  | "quizzes";

export type ExportFormat = "csv" | "excel" | "json";

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

const EXTENSION: Record<ExportFormat, string> = {
  csv: "csv",
  excel: "xlsx",
  json: "json",
};

/**
 * Downloads a list as a file. Asks the API for a Blob, reads the server-suggested file
 * name from Content-Disposition (falling back to "{entity}.{ext}"), then triggers a
 * browser download. No data is held in component state.
 *
 * Pass the list's current `query` (the same FilterQuery driving the table) to export only the
 * filtered set: the server applies the identical search/filter, so the download matches the
 * visible list across all pages. Omit it to export everything. Pagination in the query is
 * ignored by the export endpoint, and entities without filtering simply omit `query`.
 */
export async function exportData(
  entity: TransferEntity,
  format: ExportFormat,
  query?: FilterQuery
): Promise<void> {
  // Reuse the filtering framework's serializer so export speaks the exact same wire format as
  // the table's search request (filter=field:op:value, search=..., etc.). Drop pagination: the
  // export returns the whole filtered set, not a page.
  const params = query ? buildFilterParams(query) : new URLSearchParams();
  params.delete("page");
  params.delete("pageSize");
  params.set("format", format);

  const response = await api.get(`/datatransfer/${entity}/export`, {
    params,
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const fileName = match ? decodeURIComponent(match[1]) : `${entity}.${EXTENSION[format]}`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Uploads a CSV / Excel / JSON file to be imported. The API infers the format from the
 * file extension and returns a per-row summary.
 */
export async function importData(
  entity: TransferEntity,
  file: File
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);

  const response = await api.post(`/datatransfer/${entity}/import`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data as ImportResult;
}
