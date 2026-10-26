using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using QuizAPI.Exceptions;
using QuizAPI.Models.Media;
using QuizAPI.Services.Media;
using QuizAPI.Services.Media.Stock;
using Xunit;

namespace QuizAPI.Tests.Media;

/// <summary>
/// Pexels and Wikimedia Commons in the picker (docs/media/media-pipeline.md, "Outside sources"):
/// which licences come back, what the import trusts (the provider, never the client), where it
/// downloads from, and the credit that follows the image onto a question.
/// </summary>
public class StockImageTests
{
    private static readonly Guid Author = Guid.NewGuid();

    /// <summary>Answers by URL prefix and records every request, so a test can say what was fetched.</summary>
    private sealed class FakeHttp : HttpMessageHandler
    {
        public readonly List<Uri> Requests = new();
        public readonly List<string?> Authorizations = new();
        public readonly List<(string Prefix, Func<HttpResponseMessage> Respond)> Routes = new();

        public FakeHttp On(string prefix, string json, HttpStatusCode status = HttpStatusCode.OK)
        {
            Routes.Add((prefix, () => new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") }));
            return this;
        }

        /// <param name="lengthKnown">False sends no Content-Length (a chunked response), so only the
        /// read loop can notice the size.</param>
        public FakeHttp OnBytes(string prefix, byte[] bytes, bool lengthKnown = true)
        {
            Routes.Add((prefix, () => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = lengthKnown ? new ByteArrayContent(bytes) : new StreamContent(new NonSeekable(bytes)),
            }));
            return this;
        }

        private sealed class NonSeekable(byte[] bytes) : MemoryStream(bytes)
        {
            public override bool CanSeek => false;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Add(request.RequestUri!);
            Authorizations.Add(request.Headers.TryGetValues("Authorization", out var auth) ? auth.Single() : null);
            var route = Routes.FirstOrDefault(r => request.RequestUri!.AbsoluteUri.StartsWith(r.Prefix, StringComparison.Ordinal));
            return Task.FromResult(route.Respond?.Invoke() ?? new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }

    private sealed class Factory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private static readonly StockImageOptions Opts = new() { PexelsApiKey = "test-key", PageSize = 24 };

    private sealed class World
    {
        public readonly FakeHttp Http = new();
        public readonly MediaWorld Media = new();
        public readonly MemoryCache Cache = new(new MemoryCacheOptions());
        public StockImageOptions Options { get; init; } = Opts;
        public IStockImageProvider? Extra { get; init; }

        public WikimediaProvider Wikimedia => new(new HttpClient(Http, false), Microsoft.Extensions.Options.Options.Create(Options));
        public PexelsProvider Pexels
        {
            get
            {
                var client = new HttpClient(Http, false);
                PexelsProvider.Configure(client);
                return new PexelsProvider(client, Microsoft.Extensions.Options.Options.Create(Options));
            }
        }

        public async Task<T> With<T>(Func<StockImageService, Task<T>> f)
        {
            await using var ctx = Media.Context();
            var providers = new List<IStockImageProvider> { Wikimedia, Pexels };
            if (Extra is not null) providers.Add(Extra);
            var service = new StockImageService(providers, Media.Uploads(ctx), new Factory(Http), Cache,
                Microsoft.Extensions.Options.Options.Create(Options));
            return await f(service);
        }
    }

    private static string CommonsPage(int pageId, int index, string license, string mime = "image/jpeg", string artist = "<a href=\"//commons.wikimedia.org/wiki/User:Jane\">Jane &amp; Co</a>", string nonFree = "") => $$$$"""
        {"pageid":{{{{pageId}}}},"ns":6,"title":"File:Flag of Kosovo {{{{pageId}}}}.svg","index":{{{{index}}}},
         "imageinfo":[{"url":"https://upload.wikimedia.org/o/{{{{pageId}}}}.svg","descriptionurl":"https://commons.wikimedia.org/wiki/File:Flag_{{{{pageId}}}}.svg",
           "thumburl":"https://upload.wikimedia.org/thumb/{{{{pageId}}}}.png","width":800,"height":560,"mime":"{{{{mime}}}}",
           "extmetadata":{"LicenseShortName":{"value":"{{{{license}}}}"},"LicenseUrl":{"value":"http://creativecommons.org/licenses/by-sa/4.0"},
                          "Artist":{"value":{{{{System.Text.Json.JsonSerializer.Serialize(artist)}}}}},"NonFree":{"value":"{{{{nonFree}}}}"}}}]}
        """;

    private static string CommonsResult(bool more, params string[] pages) =>
        "{" + (more ? "\"continue\":{\"gsroffset\":24,\"continue\":\"gsroffset||\"}," : "") +
        "\"query\":{\"pages\":[" + string.Join(",", pages) + "]}}";

    [Theory]
    [InlineData("CC BY-SA 4.0", true)]
    [InlineData("CC BY 2.0", true)]
    [InlineData("CC-BY-SA-3.0", true)]
    [InlineData("CC0", true)]
    [InlineData("Public domain", true)]
    [InlineData("PD-USGov", true)]
    [InlineData("CC BY-NC-SA 4.0", false)]
    [InlineData("CC BY-ND 2.0", false)]
    [InlineData("CC BY-NC 3.0", false)]
    [InlineData("Fair use", false)]
    [InlineData("GFDL", false)]
    [InlineData("", false)]
    public void Only_licences_that_allow_reuse_with_credit_are_accepted(string license, bool allowed) =>
        Assert.Equal(allowed, WikimediaProvider.IsAllowedLicense(license, nonFree: null));

    [Fact]
    public void A_file_flagged_non_free_is_refused_whatever_its_licence_says() =>
        Assert.False(WikimediaProvider.IsAllowedLicense("CC BY-SA 4.0", nonFree: "true"));

    [Fact]
    public void The_commons_artist_field_becomes_plain_text() =>
        Assert.Equal("Jane & Co (talk)", WikimediaProvider.PlainText("<a href=\"x\">Jane &amp; Co</a>\n <span>(talk)</span>"));

    [Fact]
    public void A_name_repeated_in_two_language_spans_is_said_once() =>
        Assert.Equal("Unknown author", WikimediaProvider.PlainText("<span lang=\"en\">Unknown author</span> <span lang=\"fr\">Unknown author</span>"));

    [Fact]
    public async Task A_commons_search_keeps_reusable_images_in_search_order()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(true,
            CommonsPage(3, index: 2, "CC BY-SA 4.0"),
            CommonsPage(1, index: 1, "Public domain", mime: "image/svg+xml"),
            CommonsPage(2, index: 3, "CC BY-NC-SA 4.0"),          // non-commercial: out
            CommonsPage(4, index: 4, "CC BY 4.0", mime: "image/gif"))); // GIF thumbnails are GIFs: out

        var page = await w.With(s => s.SearchAsync("wikimedia", "flag of kosovo", 1));

        Assert.Equal(new[] { "1", "3" }, page.Items.Select(i => i.Id));
        Assert.True(page.HasMore);
        var first = page.Items[0];
        Assert.Equal("https://upload.wikimedia.org/thumb/1.png", first.ThumbUrl);
        Assert.Equal("Jane & Co", first.Author);
        Assert.Equal("Public domain", first.License);
    }

    [Fact]
    public async Task A_preview_off_the_sources_image_host_is_left_out_of_the_grid()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false,
            CommonsPage(1, 1, "CC0"),
            CommonsPage(2, 2, "CC0").Replace("https://upload.wikimedia.org/thumb/2.png", "https://tracker.example/pixel.png")));

        var page = await w.With(s => s.SearchAsync("wikimedia", "flag", 1));

        Assert.Equal(new[] { "1" }, page.Items.Select(i => i.Id));
    }

    [Fact]
    public async Task The_same_search_twice_asks_the_source_once()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(1, 1, "CC0")));

        await w.With(s => s.SearchAsync("wikimedia", "Paris", 1));
        await w.With(s => s.SearchAsync("wikimedia", "  paris ", 1));

        Assert.Single(w.Http.Requests);
    }

    [Theory]
    [InlineData("", 1)]
    [InlineData("x", 0)]
    [InlineData("x", 21)]
    public async Task A_blank_query_or_a_page_out_of_range_is_refused(string q, int page)
    {
        var w = new World();
        await Assert.ThrowsAsync<AppValidationException>(() => w.With(s => s.SearchAsync("wikimedia", q, page)));
        Assert.Empty(w.Http.Requests);
    }

    [Fact]
    public async Task An_unknown_source_is_refused_and_pexels_without_a_key_is_unavailable()
    {
        var w = new World { Options = new StockImageOptions { PexelsApiKey = "" } };
        await Assert.ThrowsAsync<AppValidationException>(() => w.With(s => s.SearchAsync("unsplash", "cat", 1)));
        await Assert.ThrowsAsync<ServiceUnavailableException>(() => w.With(s => s.SearchAsync("pexels", "cat", 1)));
        Assert.Contains(await w.With(s => Task.FromResult(s.Providers())), p => p.Id == "pexels" && !p.Enabled);
        Assert.Empty(w.Http.Requests);
    }

    [Fact]
    public async Task Importing_from_commons_stores_the_image_with_the_credit_the_source_gave()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(7, 1, "CC BY-SA 4.0")))
              .OnBytes("https://upload.wikimedia.org/thumb/7.png", MediaWorld.Image(1));

        var asset = await w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" }));

        Assert.Equal("Image", asset.Kind);
        Assert.Equal("Jane & Co · CC BY-SA 4.0 · Wikimedia Commons", asset.Credit!.Line);
        Assert.Equal("https://commons.wikimedia.org/wiki/File:Flag_7.svg", asset.Credit.SourceUrl);
        Assert.Equal("https://creativecommons.org/licenses/by-sa/4.0", asset.Credit.LicenseUrl); // http upgraded
        // Looked up by id, then downloaded from the source's own image host — nothing else.
        Assert.Contains(w.Http.Requests, u => u.Query.Contains("pageids=7"));
        Assert.Equal("upload.wikimedia.org", w.Http.Requests.Last().Host);
    }

    [Theory]
    [InlineData("//upload.wikimedia.org/thumb/7.png")]
    [InlineData("http://upload.wikimedia.org/thumb/7.png")]
    public async Task A_protocol_relative_or_http_commons_url_is_fetched_over_https(string thumb)
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false,
                CommonsPage(7, 1, "CC0").Replace("https://upload.wikimedia.org/thumb/7.png", thumb)))
              .OnBytes("https://upload.wikimedia.org/thumb/7.png", MediaWorld.Image(6));

        var asset = await w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" }));

        Assert.Equal("Image", asset.Kind);
        Assert.Equal("https://upload.wikimedia.org/thumb/7.png", w.Http.Requests.Last().AbsoluteUri);
    }

    /// <summary>What Commons really answers in 2026 (seen live): resized images come from
    /// thumb.wikimedia.org with tracking parameters; only an image smaller than the asked width is
    /// served from upload.wikimedia.org. Allowing only the latter left one result in twenty-four.</summary>
    [Fact]
    public async Task Commons_thumbnails_on_thumb_wikimedia_org_are_listed_and_imported()
    {
        const string thumb = "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/X.jpg/1920px-X.jpg?utm_source=commons.wikimedia.org&utm_content=thumbnail";
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false,
                CommonsPage(7, 1, "Public domain").Replace("https://upload.wikimedia.org/thumb/7.png", thumb)))
              .OnBytes("https://thumb.wikimedia.org/", MediaWorld.Image(10));

        var page = await w.With(s => s.SearchAsync("wikimedia", "United States", 1));
        Assert.Single(page.Items);

        var asset = await w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" }));
        Assert.Equal("Image", asset.Kind);
        Assert.Equal("thumb.wikimedia.org", w.Http.Requests.Last().Host);
    }

    [Fact]
    public async Task A_licence_that_changed_since_the_search_is_refused_at_import()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(7, 1, "CC BY-NC 4.0")));

        await Assert.ThrowsAsync<NotFoundException>(() =>
            w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" })));
        Assert.DoesNotContain(w.Http.Requests, u => u.Host == "upload.wikimedia.org");
    }

    [Fact]
    public async Task A_pexels_search_sends_the_key_from_the_server_and_lists_the_photos()
    {
        var w = new World();
        w.Http.On(PexelsProvider.ApiBase + "search", """
            {"page":1,"photos":[{"id":42,"width":4000,"height":3000,"photographer":"Ana Lopez","alt":"Eiffel Tower",
              "src":{"medium":"https://images.pexels.com/m42.jpeg","original":"https://images.pexels.com/o42.jpeg"}}],
             "next_page":"https://api.pexels.com/v1/search/?page=2"}
            """);

        var page = await w.With(s => s.SearchAsync("pexels", "eiffel tower", 1));

        var photo = Assert.Single(page.Items);
        Assert.Equal(("42", "Ana Lopez", "Eiffel Tower", "Pexels License"), (photo.Id, photo.Author, photo.Title, photo.License));
        Assert.True(page.HasMore);
        Assert.Equal("test-key", w.Http.Authorizations.Single()); // the bare key, as Pexels expects
        Assert.Contains("query=eiffel%20tower", w.Http.Requests.Single().Query);
    }

    [Fact]
    public async Task Importing_from_pexels_downloads_a_resized_copy_and_credits_the_photographer()
    {
        var w = new World();
        w.Http.On(PexelsProvider.ApiBase + "photos/42", """
            {"id":42,"width":4000,"height":3000,"url":"https://www.pexels.com/photo/eiffel-42/",
             "photographer":"Ana Lopez","photographer_url":"https://www.pexels.com/@ana",
             "src":{"original":"https://images.pexels.com/photos/42/pexels-photo-42.jpeg","medium":"https://images.pexels.com/m.jpeg"}}
            """).OnBytes("https://images.pexels.com/photos/42/", MediaWorld.Image(2));

        var asset = await w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "pexels", Id = "42" }));

        Assert.Equal("Photo: Ana Lopez / Pexels", asset.Credit!.Line);
        Assert.Equal(PexelsProvider.LicenseUrl, asset.Credit.LicenseUrl);
        var download = w.Http.Requests.Last();
        Assert.Equal("images.pexels.com", download.Host);
        Assert.Contains("w=1600", download.Query);
    }

    /// <summary>A provider (or a compromised response) pointing the download at another host must not
    /// make the server fetch it — the import isn't a way to reach arbitrary URLs.</summary>
    private sealed class Hostile(string downloadUrl) : IStockImageProvider
    {
        public string Id => "hostile";
        public string Name => "Hostile";
        public bool Enabled => true;
        public IReadOnlySet<string> DownloadHosts { get; } = new HashSet<string> { "images.example.com" };
        public Task<StockSearchResultDTO> SearchAsync(string query, int page, CancellationToken ct) => Task.FromResult(new StockSearchResultDTO());
        public Task<StockImageDetail?> GetAsync(string id, CancellationToken ct) => Task.FromResult<StockImageDetail?>(
            new StockImageDetail(new Uri(downloadUrl), new MediaImportCredit(MediaSource.Pexels, "x", null, null, null, null)));
    }

    [Theory]
    [InlineData("https://169.254.169.254/latest/meta-data/")]
    [InlineData("http://images.example.com/a.jpg")]
    [InlineData("https://images.example.com.evil.test/a.jpg")]
    public async Task A_download_url_off_the_declared_host_or_not_https_is_never_fetched(string url)
    {
        var w = new World { Extra = new Hostile(url) };
        await Assert.ThrowsAsync<AppValidationException>(() =>
            w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "hostile", Id = "1" })));
        Assert.Empty(w.Http.Requests);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task An_image_over_the_download_cap_is_refused_and_nothing_is_stored(bool lengthKnown)
    {
        // A real image (which the pipeline would take) one byte over the cap, so only the cap refuses it.
        var image = MediaWorld.Image(5);
        var w = new World { Options = new StockImageOptions { PexelsApiKey = "k", MaxDownloadBytes = image.Length - 1 } };
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(7, 1, "CC0")))
              .OnBytes("https://upload.wikimedia.org/thumb/7.png", image, lengthKnown);

        var refused = await Assert.ThrowsAsync<AppValidationException>(() =>
            w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" })));
        Assert.Contains("too large", refused.Message);
        await using var ctx = w.Media.Context();
        Assert.Empty(await ctx.MediaAssets.ToListAsync());
    }

    [Fact]
    public async Task The_credit_follows_the_image_onto_the_question_and_leaves_with_it()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(7, 1, "CC BY-SA 4.0")))
              .OnBytes("https://upload.wikimedia.org/thumb/7.png", MediaWorld.Image(3));
        var asset = await w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" }));

        var questionId = await w.Media.AddQuestion(Author, asset.Id);
        await using (var ctx = w.Media.Context())
        {
            var q = await ctx.Questions.IgnoreQueryFilters().SingleAsync(x => x.Id == questionId);
            Assert.Equal("Jane & Co · CC BY-SA 4.0 · Wikimedia Commons", q.MediaCredit);
            Assert.Equal("https://commons.wikimedia.org/wiki/File:Flag_7.svg", q.MediaCreditUrl);
        }

        await w.Media.SetQuestionMedia(questionId, Author, assetId: null);
        await using (var ctx = w.Media.Context())
        {
            var q = await ctx.Questions.IgnoreQueryFilters().SingleAsync(x => x.Id == questionId);
            Assert.Null(q.MediaCredit);
            Assert.Null(q.MediaCreditUrl);
        }
    }

    [Theory]
    [InlineData("javascript:alert(1)", null)]
    [InlineData("data:text/html,x", null)]
    [InlineData("/relative", null)]
    [InlineData("http://example.com", null)]
    [InlineData("https://commons.wikimedia.org/wiki/File:X.jpg", "https://commons.wikimedia.org/wiki/File:X.jpg")]
    public void Only_https_links_are_stored_in_a_credit(string url, string? stored) =>
        Assert.Equal(stored, MediaCredits.SafeUrl(url));

    [Fact]
    public async Task Bytes_uploaded_by_hand_and_then_imported_gain_the_credit()
    {
        var w = new World();
        var bytes = MediaWorld.Image(4);
        var uploaded = await w.Media.Upload(bytes, Author);
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(7, 1, "CC0")))
              .OnBytes("https://upload.wikimedia.org/thumb/7.png", bytes);

        var imported = await w.With(s => s.ImportAsync(Author, new StockImportCM { Provider = "wikimedia", Id = "7" }));

        Assert.Equal(uploaded, imported.Id);
        Assert.NotNull(imported.Credit);
    }

    // ── AI-added images: a search phrase in, the code picks and imports ─────────────────────

    [Fact]
    public async Task An_ai_search_phrase_imports_the_best_commons_result()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(7, 1, "CC BY-SA 4.0")))
              .OnBytes("https://upload.wikimedia.org/thumb/7.png", MediaWorld.Image(7));

        var asset = await w.With(s => s.AutoImportAsync(Author, "Flag of Kosovo"));

        Assert.Equal("Jane & Co · CC BY-SA 4.0 · Wikimedia Commons", asset.Credit!.Line);
        Assert.DoesNotContain(w.Http.Requests, u => u.Host == "api.pexels.com");
    }

    [Fact]
    public async Task An_ai_phrase_prefers_the_result_whose_title_names_it_over_the_first_result()
    {
        var w = new World();
        // Commons' own order: a map first, then the flag. Nobody sees the picture on this path.
        w.Http.On(WikimediaProvider.ApiUrl + "?action=query&format=json&formatversion=2&pageids=", CommonsResult(false,
                CommonsPage(2, 1, "CC0").Replace("Flag of Kosovo 2.svg", "Flag of Kosovo.svg")))
              .On(WikimediaProvider.ApiUrl, CommonsResult(false,
                CommonsPage(1, 1, "CC0").Replace("Flag of Kosovo 1.svg", "Kosovo location map.svg"),
                CommonsPage(2, 2, "CC0").Replace("Flag of Kosovo 2.svg", "Flag of Kosovo.svg")))
              .OnBytes("https://upload.wikimedia.org/thumb/2.png", MediaWorld.Image(11));

        await w.With(s => s.AutoImportAsync(Author, "Flag of Kosovo"));

        Assert.Contains(w.Http.Requests, u => u.Query.Contains("pageids=2"));
        Assert.DoesNotContain(w.Http.Requests, u => u.Query.Contains("pageids=1"));
    }

    [Fact]
    public void Ranking_by_title_puts_the_whole_phrase_first_then_every_word_then_the_rest_in_source_order()
    {
        StockImageDTO R(string id, string title) => new() { Id = id, Title = title };
        var ranked = StockImageService.RankByTitle(new[]
        {
            R("1", "Kosovo location map"),
            R("2", "Kosovo, flag on a pole"),     // every word, not the phrase
            R("3", "Flag_of_Kosovo"),              // the phrase, written as a file name
            R("4", "Pristina skyline"),
        }, "Flag of Kosovo").Select(i => i.Id);

        Assert.Equal(new[] { "3", "2", "1", "4" }, ranked);
    }

    [Fact]
    public async Task Nothing_on_commons_falls_back_to_pexels()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false))
              .On(PexelsProvider.ApiBase + "search", """
                {"page":1,"photos":[{"id":42,"width":10,"height":10,"photographer":"Ana Lopez","src":{"medium":"https://images.pexels.com/m.jpeg"}}]}
                """)
              .On(PexelsProvider.ApiBase + "photos/42", """
                {"id":42,"url":"https://www.pexels.com/photo/42/","photographer":"Ana Lopez","src":{"original":"https://images.pexels.com/photos/42/o.jpeg"}}
                """)
              .OnBytes("https://images.pexels.com/photos/42/", MediaWorld.Image(8));

        var asset = await w.With(s => s.AutoImportAsync(Author, "golden retriever"));

        Assert.Equal("Photo: Ana Lopez / Pexels", asset.Credit!.Line);
    }

    [Fact]
    public async Task A_result_that_fails_at_import_gives_way_to_the_next()
    {
        var w = new World();
        // The search lists two; looked up by id, the first is now non-commercial.
        w.Http.On(WikimediaProvider.ApiUrl + "?action=query&format=json&formatversion=2&pageids=1&",
                  CommonsResult(false, CommonsPage(1, 1, "CC BY-NC 4.0")))
              .On(WikimediaProvider.ApiUrl + "?action=query&format=json&formatversion=2&pageids=2&",
                  CommonsResult(false, CommonsPage(2, 2, "CC0")))
              .On(WikimediaProvider.ApiUrl, CommonsResult(false, CommonsPage(1, 1, "CC0"), CommonsPage(2, 2, "CC0")))
              .OnBytes("https://upload.wikimedia.org/thumb/2.png", MediaWorld.Image(9));

        var asset = await w.With(s => s.AutoImportAsync(Author, "Mona Lisa"));

        Assert.Equal("Image", asset.Kind);
        Assert.DoesNotContain(w.Http.Requests, u => u.AbsoluteUri.EndsWith("/thumb/1.png"));
    }

    [Fact]
    public async Task Nothing_anywhere_is_not_found_and_stores_nothing()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, CommonsResult(false))
              .On(PexelsProvider.ApiBase + "search", """{"page":1,"photos":[]}""");

        await Assert.ThrowsAsync<NotFoundException>(() => w.With(s => s.AutoImportAsync(Author, "xyzzy")));
        await using var ctx = w.Media.Context();
        Assert.Empty(await ctx.MediaAssets.ToListAsync());
    }

    [Fact]
    public async Task Commons_down_still_tries_pexels_and_only_both_down_is_unavailable()
    {
        var w = new World();
        w.Http.On(WikimediaProvider.ApiUrl, "busy", HttpStatusCode.TooManyRequests)
              .On(PexelsProvider.ApiBase, "down", HttpStatusCode.ServiceUnavailable);

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => w.With(s => s.AutoImportAsync(Author, "Eiffel Tower")));
        Assert.Contains(w.Http.Requests, u => u.Host == "api.pexels.com");
    }

    [Fact]
    public async Task An_ai_phrase_is_validated_like_a_search()
    {
        var w = new World();
        await Assert.ThrowsAsync<AppValidationException>(() => w.With(s => s.AutoImportAsync(Author, new string('a', 101))));
        Assert.Empty(w.Http.Requests);
    }
}
