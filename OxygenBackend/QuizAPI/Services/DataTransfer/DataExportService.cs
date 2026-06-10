using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using CsvHelper;

namespace QuizAPI.Services.DataTransfer
{
    /// <summary>
    /// Reflection-free-at-the-callsite exporter: CsvHelper / ClosedXML / System.Text.Json each
    /// read the public properties of the row type to build columns, so adding a column to a row
    /// DTO automatically adds it to every format. Stateless and thread-safe.
    /// </summary>
    public sealed class DataExportService : IDataExportService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
        };

        public ExportFile Export<T>(IEnumerable<T> rows, DataFormat format, string baseName)
        {
            var list = rows as IList<T> ?? rows.ToList();
            var fileName = $"{baseName}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.{format.Extension()}";

            byte[] content = format switch
            {
                DataFormat.Csv => WriteCsv(list),
                DataFormat.Excel => WriteExcel(list, baseName),
                DataFormat.Json => JsonSerializer.SerializeToUtf8Bytes(list, JsonOptions),
                _ => Array.Empty<byte>(),
            };

            return new ExportFile
            {
                Content = content,
                ContentType = format.ContentType(),
                FileName = fileName,
            };
        }

        private static byte[] WriteCsv<T>(IEnumerable<T> rows)
        {
            using var ms = new MemoryStream();
            // UTF-8 BOM so Excel opens accented characters correctly.
            using (var writer = new StreamWriter(ms, new UTF8Encoding(true), leaveOpen: true))
            using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
            {
                csv.WriteRecords(rows);
            }
            return ms.ToArray();
        }

        private static byte[] WriteExcel<T>(IEnumerable<T> rows, string baseName)
        {
            using var workbook = new XLWorkbook();
            var sheetName = SafeSheetName(baseName);
            var worksheet = workbook.AddWorksheet(sheetName);

            // InsertTable reads T's public properties for the header row, then the data — works
            // even for an empty collection (headers only).
            worksheet.FirstCell().InsertTable(rows, sheetName + "Table", createTable: true);
            worksheet.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }

        // Excel sheet names: max 31 chars and none of : \ / ? * [ ].
        private static string SafeSheetName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) name = "Sheet1";
            foreach (var c in new[] { ':', '\\', '/', '?', '*', '[', ']' })
                name = name.Replace(c, '_');
            return name.Length > 31 ? name.Substring(0, 31) : name;
        }
    }
}
