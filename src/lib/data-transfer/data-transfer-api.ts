import { api } from "@/lib/Api-client";

// Mirrors QuizAPI's DataTransferController. One entity slug per list that supports
// export/import; the slug is the path segment used by /api/datatransfer/{entity}/...
export type TransferEntity =
  | "categories"
  | "difficulties"
  | "languages"
  | "users"
  | "questions";

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
 */
export async function exportData(
  entity: TransferEntity,
  format: ExportFormat
): Promise<void> {
  const response = await api.get(`/datatransfer/${entity}/export`, {
    params: { format },
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
