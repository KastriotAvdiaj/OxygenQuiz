import { useRef, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  FileJson,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/common/Notifications";
import {
  exportData,
  importData,
  type ExportFormat,
  type TransferEntity,
} from "@/lib/data-transfer/data-transfer-api";
import type { FilterQuery } from "@/lib/filtering/types";
import { Button } from "../ui";

type DataTransferControlsProps = {
  /** Path segment for the API (e.g. "categories"). */
  entity: TransferEntity;
  /** Query key (prefix) to invalidate after a successful import so the table refreshes. */
  invalidateKey: QueryKey;
  /** Hide the Import button (e.g. for read-only roles). Defaults to true. */
  canImport?: boolean;
  /**
   * The list's current filter query. When provided, the export applies the same filters so the
   * download matches the visible table (across all pages). Omit for lists without filtering.
   */
  exportQuery?: FilterQuery;
  className?: string;
};

/**
 * Reusable Export (CSV / Excel / JSON) + Import controls for any list backed by the
 * DataTransferController. Drop it into a list page header; it owns its own busy state,
 * surfaces a result toast, and refreshes the list after import.
 */
export const DataTransferControls = ({
  entity,
  invalidateKey,
  canImport = true,
  exportQuery,
  className,
}: DataTransferControlsProps) => {
  const queryClient = useQueryClient();
  const addNotification = useNotifications((s) => s.addNotification);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "export" | "import">(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setBusy("export");
      await exportData(entity, format, exportQuery);
    } catch {
      addNotification({
        type: "error",
        title: "Export failed",
        message: `Could not export ${entity}.`,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    try {
      setBusy("import");
      const result = await importData(entity, file);
      queryClient.invalidateQueries({ queryKey: invalidateKey });

      const detail = result.errors.length
        ? ` ${result.errors.length} issue${result.errors.length > 1 ? "s" : ""} - see details.`
        : "";
      addNotification({
        type: result.errors.length ? "warning" : "success",
        title: "Import finished",
        message: `${result.imported} added, ${result.skipped} skipped.${detail}`,
      });
    } catch {
      addNotification({
        type: "error",
        title: "Import failed",
        message:
          "The file could not be imported. Check the format and try again.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={"flex items-center gap-2 " + (className ?? "")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="text-xs text-foreground rounded-md"
            disabled={busy !== null}
          >
            {busy === "export" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("csv")}>
            <FileText className="mr-2 h-4 w-4" /> CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("json")}>
            <FileJson className="mr-2 h-4 w-4" /> JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canImport && (
        <>
          <Button
            variant="outline"
            className="text-xs text-foreground rounded-md"
            disabled={busy !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy === "import" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </>
      )}
    </div>
  );
};
