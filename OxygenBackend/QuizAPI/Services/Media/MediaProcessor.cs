using QuizAPI.Exceptions;
using QuizAPI.Models.Media;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace QuizAPI.Services.Media
{
    /// <summary>The image as we store it: a WebP and its thumbnail, both freshly encoded.</summary>
    public sealed record ProcessedImage(byte[] Main, byte[] Thumb, int Width, int Height);

    /// <summary>The clip as we store it: the uploaded bytes minus their tags.</summary>
    public sealed record ProcessedAudio(byte[] Bytes, string Extension, string ContentType, int DurationMs);

    /// <summary>
    /// Decides what an upload really is, from its bytes — never its name or the browser's claimed
    /// type — and turns it into what we store. Pure: no storage, no database, so every rule here is
    /// a plain unit test (QuizAPI.Tests/Media/MediaProcessorTests.cs).
    ///
    /// <para><b>Images are re-encoded, always.</b> Decoding and encoding afresh is what strips
    /// EXIF (including GPS position), kills a polyglot file that is also valid HTML or a script,
    /// and drops every frame after the first of an animation. The original is not kept.</para>
    ///
    /// <para><b>Audio is checked, not transcoded</b> (no ffmpeg at launch): its container is
    /// sniffed from the first bytes, its duration read, video streams refused, and its tags —
    /// which can carry names, comments and embedded pictures — removed.</para>
    /// </summary>
    public static class MediaProcessor
    {
        public const string ImageContentType = "image/webp";

        /// <summary>What the bytes are, or null if they're nothing we accept.</summary>
        public static MediaKind? Sniff(ReadOnlySpan<byte> b)
        {
            if (LooksLikeImage(b)) return MediaKind.Image;
            if (SniffAudio(b) is not null) return MediaKind.Audio;
            return null;
        }

        private static bool LooksLikeImage(ReadOnlySpan<byte> b) =>
            (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF)                       // JPEG
            || (b.Length >= 8 && b[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) // PNG
            || (b.Length >= 12 && b[..4].SequenceEqual("RIFF"u8) && b[8..12].SequenceEqual("WEBP"u8)); // WebP

        public static ProcessedImage ProcessImage(byte[] bytes, MediaOptions o)
        {
            if (bytes.Length > o.ImageMaxSourceBytes)
                throw new AppValidationException($"Images can be up to {o.ImageMaxSourceBytes / (1024 * 1024)} MB.");

            IImageFormat format;
            ImageInfo info;
            try
            {
                format = Image.DetectFormat(bytes);
                // Identify reads the header only. The size check happens before a single pixel is
                // decoded — that ordering is the whole defence against a decompression bomb.
                info = Image.Identify(bytes);
            }
            catch (Exception ex) when (ex is UnknownImageFormatException or InvalidImageContentException or NotSupportedException)
            {
                throw new AppValidationException("That file isn't an image we can read. Use a JPEG, PNG or WebP.");
            }

            if (format is not JpegFormat and not PngFormat and not WebpFormat)
                throw new AppValidationException("Images must be JPEG, PNG or WebP.");

            if (info.Width <= 0 || info.Height <= 0)
                throw new AppValidationException("That image has no size.");
            if (info.Width > o.MaxSourceEdge || info.Height > o.MaxSourceEdge
                || (long)info.Width * info.Height > o.MaxSourcePixels)
                throw new AppValidationException("That image is too large in pixels. Use one under 40 megapixels.");

            Image image;
            try
            {
                image = Image.Load(new DecoderOptions { MaxFrames = 1 }, bytes);
            }
            catch (Exception ex) when (ex is UnknownImageFormatException or InvalidImageContentException or NotSupportedException)
            {
                throw new AppValidationException("That image is damaged and can't be read.");
            }

            using (image)
            {
                // Apply the camera's rotation flag before the metadata carrying it is thrown away,
                // or a portrait phone photo is stored on its side.
                image.Mutate(x => x.AutoOrient());
                StripMetadata(image);

                if (Math.Max(image.Width, image.Height) > o.ImageMaxEdge)
                    image.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Mode = ResizeMode.Max,
                        Size = new Size(o.ImageMaxEdge, o.ImageMaxEdge),
                    }));

                var encoder = new WebpEncoder { Quality = o.WebpQuality, FileFormat = WebpFileFormatType.Lossy };
                var main = Encode(image, encoder);
                var (w, h) = (image.Width, image.Height);

                using var thumb = image.Clone(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(o.ThumbEdge, o.ThumbEdge),
                }));
                return new ProcessedImage(main, Encode(thumb, encoder), w, h);
            }
        }

        private static void StripMetadata(Image image)
        {
            image.Metadata.ExifProfile = null;
            image.Metadata.IptcProfile = null;
            image.Metadata.XmpProfile = null;
            image.Metadata.IccProfile = null;
            foreach (var frame in image.Frames)
            {
                frame.Metadata.ExifProfile = null;
                frame.Metadata.IptcProfile = null;
                frame.Metadata.XmpProfile = null;
                frame.Metadata.IccProfile = null;
            }
        }

        private static byte[] Encode(Image image, IImageEncoder encoder)
        {
            using var ms = new MemoryStream();
            image.Save(ms, encoder);
            return ms.ToArray();
        }

        // ── Audio ─────────────────────────────────────────────────────────────────────────

        private static (string Ext, string ContentType)? SniffAudio(ReadOnlySpan<byte> b)
        {
            if (b.Length >= 3 && b[..3].SequenceEqual("ID3"u8)) return ("mp3", "audio/mpeg");
            // An MPEG audio frame header: 11 set sync bits, then a layer that isn't "reserved".
            if (b.Length >= 2 && b[0] == 0xFF && (b[1] & 0xE0) == 0xE0 && (b[1] & 0x06) != 0) return ("mp3", "audio/mpeg");
            if (b.Length >= 4 && b[..4].SequenceEqual("OggS"u8)) return ("ogg", "audio/ogg");
            if (b.Length >= 12 && b[4..8].SequenceEqual("ftyp"u8)) return ("m4a", "audio/mp4");
            return null;
        }

        public static ProcessedAudio ProcessAudio(byte[] bytes, MediaOptions o)
        {
            if (bytes.Length > o.AudioMaxBytes)
                throw new AppValidationException($"Audio clips can be up to {o.AudioMaxBytes / (1024 * 1024)} MB.");

            var sniffed = SniffAudio(bytes)
                ?? throw new AppValidationException("That file isn't audio we can play. Use MP3, M4A or OGG.");

            var stream = new MemoryStream();
            stream.Write(bytes);
            stream.Position = 0;

            TimeSpan duration;
            try
            {
                using var file = TagLib.File.Create(new MemoryFileAbstraction($"clip.{sniffed.Ext}", stream));
                var props = file.Properties;
                if (props is null || props.Duration <= TimeSpan.Zero)
                    throw new AppValidationException("That audio file has no length we can read.");
                // An .mp4 and an Ogg can carry video; "isom"/"mp42" brands are shared by both.
                if (props.MediaTypes.HasFlag(TagLib.MediaTypes.Video) || props.VideoWidth > 0)
                    throw new AppValidationException("Video isn't supported yet. Upload an audio clip.");
                if (!props.MediaTypes.HasFlag(TagLib.MediaTypes.Audio))
                    throw new AppValidationException("That file has no audio in it.");

                // TagLib estimates an MP3's length from its first frame and the file size, which is
                // wrong for anything with an Info/Xing frame or a variable bitrate — a 61-second
                // clip measured 35. The limit is a rule, so MP3 length is counted frame by frame.
                if (sniffed.Ext == "mp3")
                {
                    var (length, end) = Mp3Walk(bytes);
                    // Frames stop, then more bytes follow: a player may resync and keep playing
                    // past where we stopped counting, so a long clip could hide behind one junk
                    // byte. An ID3v1 or APE tag at the end is small; anything bigger is refused.
                    if (bytes.Length - end > TrailingTagAllowance)
                        throw new AppValidationException("That MP3 has data after its audio that we can't read.");
                    duration = length;
                }
                else duration = props.Duration;

                file.RemoveTags(TagLib.TagTypes.AllTags);
                file.Save();
            }
            catch (AppValidationException) { throw; }
            catch (Exception ex) when (ex is TagLib.CorruptFileException or TagLib.UnsupportedFormatException or IOException)
            {
                throw new AppValidationException("That audio file is damaged or in a format we can't read.");
            }

            if (duration.TotalSeconds > o.AudioMaxSeconds + 0.5)
                throw new AppValidationException($"Audio clips can be up to {o.AudioMaxSeconds} seconds long.");

            return new ProcessedAudio(stream.ToArray(), sniffed.Ext, sniffed.ContentType, (int)Math.Round(duration.TotalMilliseconds));
        }

        // MPEG audio header tables: [version][index]. Version: 0 = MPEG-1, 1 = MPEG-2, 2 = MPEG-2.5.
        private static readonly int[][] SampleRates =
        {
            new[] { 44100, 48000, 32000 }, new[] { 22050, 24000, 16000 }, new[] { 11025, 12000, 8000 },
        };
        private static readonly int[] BitratesV1L3 = { 0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320 };
        private static readonly int[] BitratesV2L3 = { 0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160 };
        private static readonly int[] BitratesV1L2 = { 0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384 };
        private static readonly int[] BitratesV1L1 = { 0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448 };
        private static readonly int[] BitratesV2L1 = { 0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256 };

        /// <summary>
        /// The length of an MP3, from walking every frame and adding up its samples. Skips an ID3v2
        /// tag at the start; stops at the first byte that isn't a frame (an ID3v1 tag, trailing
        /// junk). Correct for constant and variable bitrate alike, which an estimate isn't.
        /// </summary>
        /// <summary>How many bytes may follow an MP3's last frame — room for an ID3v1 (128) or APE tag.</summary>
        internal const int TrailingTagAllowance = 8 * 1024;

        internal static TimeSpan Mp3Duration(ReadOnlySpan<byte> b) => Mp3Walk(b).Duration;

        /// <summary>The length, and the offset just past the last frame.</summary>
        internal static (TimeSpan Duration, int End) Mp3Walk(ReadOnlySpan<byte> b)
        {
            var pos = 0;
            if (b.Length >= 10 && b[..3].SequenceEqual("ID3"u8))
            {
                var size = (b[6] & 0x7F) << 21 | (b[7] & 0x7F) << 14 | (b[8] & 0x7F) << 7 | (b[9] & 0x7F);
                pos = 10 + size + ((b[5] & 0x10) != 0 ? 10 : 0);
            }

            double seconds = 0;
            while (pos + 4 <= b.Length)
            {
                if (b[pos] != 0xFF || (b[pos + 1] & 0xE0) != 0xE0) break;

                var versionBits = (b[pos + 1] >> 3) & 0x03;   // 00 = 2.5, 10 = 2, 11 = 1
                var layerBits = (b[pos + 1] >> 1) & 0x03;     // 01 = III, 10 = II, 11 = I
                var bitrateIndex = (b[pos + 2] >> 4) & 0x0F;
                var rateIndex = (b[pos + 2] >> 2) & 0x03;
                var padding = (b[pos + 2] >> 1) & 0x01;
                if (versionBits == 1 || layerBits == 0 || bitrateIndex is 0 or 15 || rateIndex == 3) break;

                var v = versionBits == 3 ? 0 : versionBits == 2 ? 1 : 2;
                var sampleRate = SampleRates[v][rateIndex];
                int kbps, samples, length;
                switch (layerBits)
                {
                    case 3: // Layer I
                        kbps = (v == 0 ? BitratesV1L1 : BitratesV2L1)[bitrateIndex];
                        samples = 384;
                        length = (12 * kbps * 1000 / sampleRate + padding) * 4;
                        break;
                    case 2: // Layer II
                        kbps = (v == 0 ? BitratesV1L2 : BitratesV2L3)[bitrateIndex];
                        samples = 1152;
                        length = 144 * kbps * 1000 / sampleRate + padding;
                        break;
                    default: // Layer III
                        kbps = (v == 0 ? BitratesV1L3 : BitratesV2L3)[bitrateIndex];
                        samples = v == 0 ? 1152 : 576;
                        length = (v == 0 ? 144 : 72) * kbps * 1000 / sampleRate + padding;
                        break;
                }
                if (length <= 4) break;

                if (pos + length > b.Length) break; // a truncated last frame isn't audio
                seconds += (double)samples / sampleRate;
                pos += length;
            }
            return (TimeSpan.FromSeconds(seconds), pos);
        }

        /// <summary>Lets TagLib read and rewrite an in-memory file. Its Close is a no-op so the
        /// stream (and the tag-stripped bytes in it) outlive TagLib's File.</summary>
        private sealed class MemoryFileAbstraction(string name, MemoryStream stream) : TagLib.File.IFileAbstraction
        {
            public string Name { get; } = name;
            public Stream ReadStream => stream;
            public Stream WriteStream => stream;
            public void CloseStream(Stream s) { }
        }
    }
}
