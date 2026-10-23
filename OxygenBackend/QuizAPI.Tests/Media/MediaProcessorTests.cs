using System.Text;
using QuizAPI.Exceptions;
using QuizAPI.Models.Media;
using QuizAPI.Services.Media;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace QuizAPI.Tests.Media;

/// <summary>
/// What an upload really is, decided from its bytes (docs/media/media-pipeline.md, "What processing
/// produces"). The audio fixtures are real files, made with:
/// <code>
/// ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -ac 1 -b:a 32k -metadata title="Secret Title" -metadata comment="private note" tone-5s-tagged.mp3
/// ffmpeg -f lavfi -i "sine=frequency=440:duration=61" -ac 1 -ar 8000 -b:a 8k tone-61s.mp3
/// ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -ac 1 -b:a 32k tone-3s.m4a
/// ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -ac 1 -c:a libvorbis -q:a 0 tone-3s.ogg
/// ffmpeg -f lavfi -i "color=c=red:s=64x64:d=1" -f lavfi -i "sine=duration=1" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart tiny-video.mp4
/// </code>
/// </summary>
public class MediaProcessorTests
{
    private static readonly MediaOptions O = new();

    private static byte[] Fixture(string name) =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Media", "Fixtures", name));

    internal static byte[] Png(int w, int h)
    {
        using var img = new Image<Rgb24>(w, h, new Rgb24(200, 30, 30));
        using var ms = new MemoryStream();
        img.Save(ms, new PngEncoder());
        return ms.ToArray();
    }

    internal static byte[] JpegWithGps(int w, int h)
    {
        using var img = new Image<Rgb24>(w, h, new Rgb24(30, 200, 30));
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.GPSLatitude, new[] { new Rational(42, 1), new Rational(39, 1), new Rational(0, 1) });
        exif.SetValue(ExifTag.Make, "PhoneCo");
        img.Metadata.ExifProfile = exif;
        using var ms = new MemoryStream();
        img.Save(ms, new JpegEncoder());
        return ms.ToArray();
    }

    // ── What counts as an image ─────────────────────────────────────────────────────────

    [Fact]
    public void A_text_file_renamed_to_png_is_nothing_we_accept()
    {
        // The name never reaches the processor: only bytes do. A .png that is really text is text.
        Assert.Null(MediaProcessor.Sniff(Encoding.UTF8.GetBytes("hello, I am not a picture")));
    }

    [Fact]
    public void An_svg_is_refused_because_it_can_carry_script()
    {
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");
        Assert.Null(MediaProcessor.Sniff(svg));
    }

    [Fact]
    public void Html_is_refused()
    {
        Assert.Null(MediaProcessor.Sniff(Encoding.UTF8.GetBytes("<!doctype html><script>fetch('/api')</script>")));
    }

    [Fact]
    public void A_file_with_an_image_signature_but_garbage_after_it_is_refused_on_decode()
    {
        // Passes the sniff (PNG magic bytes) and must still be refused, not crash the request.
        var fake = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 5, 6, 7, 8 };
        Assert.Equal(MediaKind.Image, MediaProcessor.Sniff(fake));
        Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessImage(fake, O));
    }

    [Fact]
    public void Jpeg_png_and_webp_are_images()
    {
        Assert.Equal(MediaKind.Image, MediaProcessor.Sniff(Png(4, 4)));
        Assert.Equal(MediaKind.Image, MediaProcessor.Sniff(JpegWithGps(4, 4)));
        var webp = MediaProcessor.ProcessImage(Png(4, 4), O).Main;
        Assert.Equal(MediaKind.Image, MediaProcessor.Sniff(webp));
    }

    // ── What processing does to an image ─────────────────────────────────────────────────

    [Fact]
    public void Re_encoding_strips_the_gps_position_and_camera_details()
    {
        var input = JpegWithGps(20, 20);
        using (var before = Image.Load(input))
            Assert.NotNull(before.Metadata.ExifProfile); // the fixture really carries GPS

        var output = MediaProcessor.ProcessImage(input, O);

        using var after = Image.Load(output.Main);
        Assert.Null(after.Metadata.ExifProfile);
    }

    [Fact]
    public void The_stored_image_is_a_webp_no_larger_than_1600px_with_a_400px_thumbnail()
    {
        var output = MediaProcessor.ProcessImage(Png(3200, 1000), O);

        Assert.Equal((1600, 500), (output.Width, output.Height));
        using var main = Image.Load(output.Main);
        Assert.Equal("Webp", main.Metadata.DecodedImageFormat!.Name, ignoreCase: true);
        using var thumb = Image.Load(output.Thumb);
        Assert.Equal(400, Math.Max(thumb.Width, thumb.Height));
    }

    [Fact]
    public void A_small_image_is_not_upscaled()
    {
        var output = MediaProcessor.ProcessImage(Png(300, 200), O);
        Assert.Equal((300, 200), (output.Width, output.Height));
    }

    [Fact]
    public void An_image_with_a_side_beyond_the_limit_is_refused_before_decoding()
    {
        // 13000 x 1 compresses to almost nothing, which is exactly the shape of a decompression
        // bomb: small on disk, enormous once decoded. The header check refuses it.
        Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessImage(Png(13_000, 1), O));
    }

    [Fact]
    public void An_image_over_the_pixel_budget_is_refused()
    {
        var tight = new MediaOptions { MaxSourcePixels = 100 };
        Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessImage(Png(20, 20), tight));
        MediaProcessor.ProcessImage(Png(10, 10), tight); // exactly at the budget is fine
    }

    [Fact]
    public void An_image_over_the_byte_limit_is_refused()
    {
        var tight = new MediaOptions { ImageMaxSourceBytes = 10 };
        Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessImage(Png(4, 4), tight));
    }

    // ── Audio ───────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("tone-5s-tagged.mp3", "mp3", "audio/mpeg", 5)]
    [InlineData("tone-3s.m4a", "m4a", "audio/mp4", 3)]
    [InlineData("tone-3s.ogg", "ogg", "audio/ogg", 3)]
    public void Mp3_m4a_and_ogg_clips_are_accepted_with_their_duration(string file, string ext, string type, int seconds)
    {
        var bytes = Fixture(file);
        Assert.Equal(MediaKind.Audio, MediaProcessor.Sniff(bytes));

        var clip = MediaProcessor.ProcessAudio(bytes, O);

        Assert.Equal(ext, clip.Extension);
        Assert.Equal(type, clip.ContentType);
        Assert.InRange(clip.DurationMs, seconds * 1000 - 300, seconds * 1000 + 300);
    }

    [Fact]
    public void A_clip_over_60_seconds_is_refused()
    {
        var ex = Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessAudio(Fixture("tone-61s.mp3"), O));
        Assert.Contains("60 seconds", ex.Message);
    }

    [Fact]
    public void A_long_clip_hidden_after_junk_bytes_is_refused()
    {
        // 5 s of frames, 9 KB of junk where the frame walk stops, then 61 s more frames that a
        // player could resync to. Counting only the first 5 s would let 66 s through.
        var hidden = Fixture("tone-5s-tagged.mp3")
            .Concat(new byte[9 * 1024])
            .Concat(Fixture("tone-61s.mp3"))
            .ToArray();
        Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessAudio(hidden, O));
    }

    [Fact]
    public void A_video_is_refused_even_though_its_container_looks_like_m4a()
    {
        // MP4 and M4A share the "ftyp" box and brands; only reading the streams tells them apart.
        var ex = Assert.Throws<AppValidationException>(() => MediaProcessor.ProcessAudio(Fixture("tiny-video.mp4"), O));
        Assert.Contains("Video", ex.Message);
    }

    [Fact]
    public void Tags_are_stripped_from_a_stored_clip()
    {
        var input = Fixture("tone-5s-tagged.mp3");
        Assert.Contains("Secret Title", Encoding.Latin1.GetString(input)); // the fixture really carries it

        var clip = MediaProcessor.ProcessAudio(input, O);

        Assert.DoesNotContain("Secret Title", Encoding.Latin1.GetString(clip.Bytes));
        Assert.DoesNotContain("private note", Encoding.Latin1.GetString(clip.Bytes));
        // And it is still a playable clip of the same length.
        Assert.InRange(MediaProcessor.ProcessAudio(clip.Bytes, O).DurationMs, 4700, 5300);
    }
}
