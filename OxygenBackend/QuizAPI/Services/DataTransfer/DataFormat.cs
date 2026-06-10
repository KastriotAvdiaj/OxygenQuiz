using System.IO;

namespace QuizAPI.Services.DataTransfer
{
    /// <summary>
    /// The wire formats the export/import framework speaks. One enum drives both directions
    /// so a request that says "csv" exports CSV and imports CSV the same way.
    /// </summary>
    public enum DataFormat
    {
        Csv,
        Excel,
        Json
    }

    public static class DataFormatExtensions
    {
        /// <summary>MIME type sent on the export response so the browser saves it correctly.</summary>
        public static string ContentType(this DataFormat format) => format switch
        {
            DataFormat.Csv => "text/csv",
            DataFormat.Excel => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            DataFormat.Json => "application/json",
            _ => "application/octet-stream"
        };

        /// <summary>File extension (no dot) for the generated download.</summary>
        public static string Extension(this DataFormat format) => format switch
        {
            DataFormat.Csv => "csv",
            DataFormat.Excel => "xlsx",
            DataFormat.Json => "json",
            _ => "bin"
        };

        /// <summary>
        /// Parses a format name from a query string (?format=csv|excel|json). Accepts a few
        /// aliases (xlsx/xls -> Excel). Defaults to CSV when unrecognised so a bad value
        /// degrades gracefully rather than 400-ing.
        /// </summary>
        public static bool TryParse(string? name, out DataFormat format)
        {
            switch ((name ?? string.Empty).Trim().ToLowerInvariant())
            {
                case "csv":
                    format = DataFormat.Csv; return true;
                case "excel":
                case "xlsx":
                case "xls":
                    format = DataFormat.Excel; return true;
                case "json":
                    format = DataFormat.Json; return true;
                default:
                    format = DataFormat.Csv; return false;
            }
        }

        /// <summary>Infers the format from an uploaded file's extension (used by import).</summary>
        public static bool TryFromFileName(string? fileName, out DataFormat format)
        {
            var ext = Path.GetExtension(fileName ?? string.Empty).TrimStart('.');
            return TryParse(ext, out format);
        }
    }
}
