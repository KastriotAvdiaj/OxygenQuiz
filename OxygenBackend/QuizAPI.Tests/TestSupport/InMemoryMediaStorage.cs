using QuizAPI.Services.Media;

namespace QuizAPI.Tests.TestSupport;

/// <summary>An <see cref="IMediaStorage"/> that keeps objects in a dictionary, so tests can see
/// exactly what was written and deleted. <see cref="FailDeletes"/> simulates an unreachable bucket.</summary>
internal sealed class InMemoryMediaStorage : IMediaStorage
{
    public Dictionary<string, (byte[] Bytes, string ContentType)> Objects { get; } = new();
    public bool FailDeletes { get; set; }

    public Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct = default)
    {
        Objects[key] = (bytes, contentType);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        if (FailDeletes) throw new IOException("bucket unreachable");
        Objects.Remove(key);
        return Task.CompletedTask;
    }

    public string UrlFor(string key) => $"https://media.test/{key}";
}
