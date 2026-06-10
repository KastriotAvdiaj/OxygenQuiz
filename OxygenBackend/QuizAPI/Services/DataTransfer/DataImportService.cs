using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;

namespace QuizAPI.Services.DataTransfer
{
    /// <summary>
    /// Parses CSV / Excel / JSON into flat row DTOs. Header matching is case-insensitive and
    /// unknown/missing columns are tolerated, so a file exported from one format imports back
    /// cleanly and hand-made files don't need to match column order exactly.
    /// </summary>
    public sealed class DataImportService : IDataImportService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public List<T> Parse<T>(Stream stream, DataFormat format) where T : class, new() => format switch
        {
            DataFormat.Csv => ReadCsv<T>(stream),
            DataFormat.Excel => ReadExcel<T>(stream),
            DataFormat.Json => ReadJson<T>(stream),
            _ => new List<T>(),
        };

        private static List<T> ReadCsv<T>(Stream stream) where T : class, new()
        {
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                // Be forgiving: match headers ignoring case/whitespace, skip extra/missing fields.
                PrepareHeaderForMatch = args => args.Header.Trim().ToLowerInvariant(),
                HeaderValidated = null,
                MissingFieldFound = null,
                TrimOptions = TrimOptions.Trim,
            };

            using var reader = new StreamReader(stream);
            using var csv = new CsvReader(reader, config);
            return csv.GetRecords<T>().ToList();
        }

        private static List<T> ReadJson<T>(Stream stream) where T : class, new()
        {
            using var ms = new MemoryStream();
            stream.CopyTo(ms);
            var bytes = ms.ToArray();
            if (bytes.Length == 0) return new List<T>();

            var result = JsonSerializer.Deserialize<List<T>>(bytes, JsonOptions);
            return result ?? new List<T>();
        }

        private static List<T> ReadExcel<T>(Stream stream) where T : class, new()
        {
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            var range = worksheet?.RangeUsed();
            if (range == null) return new List<T>();

            var rows = range.RowsUsed().ToList();
            if (rows.Count == 0) return new List<T>();

            var writableProps = typeof(T)
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.CanWrite)
                .ToList();

            // Map each used header cell to a property by name (case-insensitive).
            var columnToProp = new Dictionary<int, PropertyInfo>();
            foreach (var cell in rows[0].CellsUsed())
            {
                var header = cell.GetString().Trim();
                var prop = writableProps.FirstOrDefault(
                    p => string.Equals(p.Name, header, StringComparison.OrdinalIgnoreCase));
                if (prop != null) columnToProp[cell.Address.ColumnNumber] = prop;
            }

            var result = new List<T>();
            foreach (var row in rows.Skip(1))
            {
                var item = new T();
                var anySet = false;
                foreach (var (column, prop) in columnToProp.Select(kv => (kv.Key, kv.Value)))
                {
                    var raw = row.Cell(column).GetString();
                    if (string.IsNullOrWhiteSpace(raw)) continue;

                    var value = ConvertTo(raw.Trim(), prop.PropertyType);
                    if (value != null)
                    {
                        prop.SetValue(item, value);
                        anySet = true;
                    }
                }
                if (anySet) result.Add(item);
            }
            return result;
        }

        // Parses a raw cell string into the target property type. Returns null (skip) on failure
        // so one bad cell never aborts the whole import.
        private static object? ConvertTo(string raw, Type target)
        {
            var underlying = Nullable.GetUnderlyingType(target) ?? target;
            try
            {
                if (underlying == typeof(string)) return raw;
                if (underlying == typeof(bool)) return ParseBool(raw);
                if (underlying.IsEnum) return Enum.Parse(underlying, raw, ignoreCase: true);
                if (underlying == typeof(Guid)) return Guid.Parse(raw);
                if (underlying == typeof(DateTime))
                    return DateTime.Parse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal);
                return Convert.ChangeType(raw, underlying, CultureInfo.InvariantCulture);
            }
            catch
            {
                return null;
            }
        }

        private static bool ParseBool(string raw)
        {
            switch (raw.Trim().ToLowerInvariant())
            {
                case "1":
                case "true":
                case "yes":
                case "y":
                    return true;
                default:
                    return false;
            }
        }
    }
}
