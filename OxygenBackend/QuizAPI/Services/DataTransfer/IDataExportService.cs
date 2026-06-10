using System.Collections.Generic;

namespace QuizAPI.Services.DataTransfer
{
    /// <summary>
    /// Serializes a flat list of row DTOs to CSV, Excel or JSON. Entity-agnostic: callers
    /// project their entity to a flat row type (e.g. CategoryExportRow) and hand it here, so
    /// the same serializer serves every list endpoint.
    /// </summary>
    public interface IDataExportService
    {
        /// <param name="rows">The already-projected, flat rows to write.</param>
        /// <param name="format">Output format.</param>
        /// <param name="baseName">Logical name (e.g. "categories"); used for the file name and Excel sheet.</param>
        ExportFile Export<T>(IEnumerable<T> rows, DataFormat format, string baseName);
    }
}
