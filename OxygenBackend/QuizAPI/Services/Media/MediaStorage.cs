using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace QuizAPI.Services.Media
{
    /// <summary>
    /// Where stored files' bytes live. Two implementations: <see cref="DiskMediaStorage"/> for
    /// development, unit tests and the E2E stack, and <see cref="R2MediaStorage"/> for production
    /// (and development, when R2 credentials are configured). Keys are content-addressed
    /// (<c>images/{sha256}.webp</c>), so a key's bytes never change and a PUT of an existing key
    /// is a harmless rewrite of the same bytes.
    /// </summary>
    public interface IMediaStorage
    {
        Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct = default);

        /// <summary>Deleting a key that doesn't exist is not an error.</summary>
        Task DeleteAsync(string key, CancellationToken ct = default);

        /// <summary>The public URL a browser loads the key from.</summary>
        string UrlFor(string key);
    }

    public sealed class DiskMediaStorage : IMediaStorage
    {
        private readonly string _root;
        private readonly string _publicBase;
        private readonly IHttpContextAccessor _http;

        public DiskMediaStorage(IOptions<MediaOptions> options, IWebHostEnvironment env, IHttpContextAccessor http)
        {
            var o = options.Value.Disk;
            _root = Path.GetFullPath(Path.Combine(env.ContentRootPath, o.RootPath));
            _publicBase = o.PublicBaseUrl.TrimEnd('/');
            _http = http;
        }

        public async Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct = default)
        {
            var path = PathFor(key);
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            await File.WriteAllBytesAsync(path, bytes, ct);
        }

        public Task DeleteAsync(string key, CancellationToken ct = default)
        {
            var path = PathFor(key);
            if (File.Exists(path)) File.Delete(path);
            return Task.CompletedTask;
        }

        public string UrlFor(string key)
        {
            if (_publicBase.Length > 0) return $"{_publicBase}/{key}";
            var request = _http.HttpContext?.Request;
            var origin = request is null ? "" : $"{request.Scheme}://{request.Host}";
            return $"{origin}/uploads/media/{key}";
        }

        /// <summary>Keys are built by us from a hex hash, but the path is still checked to stay
        /// under the root, so a malformed key can never write outside it.</summary>
        private string PathFor(string key)
        {
            var full = Path.GetFullPath(Path.Combine(_root, key));
            if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                throw new InvalidOperationException($"Media key '{key}' resolves outside the storage root.");
            return full;
        }
    }

    /// <summary>
    /// Cloudflare R2 through its S3-compatible API. Objects are written with a one-year immutable
    /// cache header: keys are content hashes, so a URL's bytes never change and Cloudflare's cache
    /// can keep them forever. docs/media/media-pipeline.md, "Launch setup".
    /// </summary>
    public sealed class R2MediaStorage : IMediaStorage, IDisposable
    {
        private readonly AmazonS3Client _client;
        private readonly string _bucket;
        private readonly string _publicBase;

        public R2MediaStorage(IOptions<MediaOptions> options)
        {
            var o = options.Value.R2;
            if (string.IsNullOrWhiteSpace(o.AccountId) || string.IsNullOrWhiteSpace(o.AccessKeyId)
                || string.IsNullOrWhiteSpace(o.SecretAccessKey) || string.IsNullOrWhiteSpace(o.Bucket)
                || string.IsNullOrWhiteSpace(o.PublicBaseUrl))
                throw new InvalidOperationException(
                    "Media:Storage is R2 but Media:R2 is incomplete (AccountId, AccessKeyId, SecretAccessKey, Bucket, PublicBaseUrl).");

            _client = new AmazonS3Client(
                new BasicAWSCredentials(o.AccessKeyId, o.SecretAccessKey),
                new AmazonS3Config
                {
                    ServiceURL = $"https://{o.AccountId}.r2.cloudflarestorage.com",
                    ForcePathStyle = true,
                    AuthenticationRegion = "auto",
                    // R2 rejects the CRC checksums the SDK adds by default since 3.7.4xx/4.x.
                    RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                    ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
                });
            _bucket = o.Bucket;
            _publicBase = o.PublicBaseUrl.TrimEnd('/');
        }

        public async Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken ct = default)
        {
            using var stream = new MemoryStream(bytes, writable: false);
            var request = new PutObjectRequest
            {
                BucketName = _bucket,
                Key = key,
                InputStream = stream,
                ContentType = contentType,
                // R2 does not support streaming (aws-chunked) payload signatures.
                DisablePayloadSigning = true,
                UseChunkEncoding = false,
            };
            request.Headers.CacheControl = "public, max-age=31536000, immutable";
            await _client.PutObjectAsync(request, ct);
        }

        public async Task DeleteAsync(string key, CancellationToken ct = default) =>
            await _client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = _bucket, Key = key }, ct);

        public string UrlFor(string key) => $"{_publicBase}/{key}";

        public void Dispose() => _client.Dispose();
    }
}
