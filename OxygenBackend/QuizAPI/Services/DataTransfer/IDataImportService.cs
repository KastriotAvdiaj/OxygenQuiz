using System.Collections.Generic;
using System.IO;

namespace QuizAPI.Services.DataTransfer
{
    /// <summary>
    /// Parses an uploaded CSV / Excel / JSON stream into a list of flat row DTOs. The caller
    /// then validates and persists each row through the normal create path, so import reuses
    /// the same business rules as the UI.
    /// </summary>
    public interface IDataImportService
    {
        List<T> Parse<T>(Stream stream, DataFormat format) where T : class, new();
    }
}
