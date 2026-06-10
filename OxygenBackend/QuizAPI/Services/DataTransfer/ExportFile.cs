namespace QuizAPI.Services.DataTransfer
{
    /// <summary>
    /// A serialized export ready to stream back to the client: the bytes, the MIME type and a
    /// suggested download file name. The controller turns this straight into a File() result.
    /// </summary>
    public sealed class ExportFile
    {
        public required byte[] Content { get; init; }
        public required string ContentType { get; init; }
        public required string FileName { get; init; }
    }
}
