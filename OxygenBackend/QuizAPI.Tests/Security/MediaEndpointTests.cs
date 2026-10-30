using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuizAPI.Controllers.Media;
using QuizAPI.DTOs.Question;
using QuizAPI.DTOs.Quiz;
using QuizAPI.Middleware;
using Xunit;

namespace QuizAPI.Tests.Security;

/// <summary>
/// The media upload endpoint's guards, and the rule that no client can set a media URL
/// (docs/media/media-pipeline.md).
/// </summary>
public class MediaEndpointTests
{
    [Fact]
    public void Uploading_needs_a_signed_in_caller_and_no_action_opts_out()
    {
        Assert.NotNull(typeof(MediaController).GetCustomAttribute<AuthorizeAttribute>());
        Assert.DoesNotContain(
            typeof(MediaController).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly),
            m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null);
    }

    [Fact]
    public void The_stock_image_endpoints_need_a_signed_in_caller_and_are_rate_limited()
    {
        Assert.NotNull(typeof(StockImagesController).GetCustomAttribute<AuthorizeAttribute>());
        Assert.DoesNotContain(
            typeof(StockImagesController).GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly),
            m => m.GetCustomAttribute<AllowAnonymousAttribute>() is not null);
        Assert.Equal(RateLimitingExtensions.MediaSearchPolicy,
            typeof(StockImagesController).GetMethod(nameof(StockImagesController.Search))!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);
        // An import stores a file, so it spends the same hourly allowance as an upload.
        Assert.Equal(RateLimitingExtensions.MediaUploadPolicy,
            typeof(StockImagesController).GetMethod(nameof(StockImagesController.Import))!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);
        Assert.Equal(RateLimitingExtensions.MediaUploadPolicy,
            typeof(StockImagesController).GetMethod(nameof(StockImagesController.Auto))!.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);
    }

    /// <summary>The import is named by provider and id; a URL or a credit in its body would be the
    /// client choosing what the server fetches or what licence an image claims.</summary>
    [Fact]
    public void The_import_body_carries_no_url_or_credit()
    {
        Assert.Equal(new[] { "Id", "Provider" },
            typeof(QuizAPI.Services.Media.Stock.StockImportCM).GetProperties().Select(p => p.Name).OrderBy(n => n));
        // An AI-written question hands over a phrase to search for — not a link to fetch.
        Assert.Equal(new[] { "Query" },
            typeof(QuizAPI.Services.Media.Stock.StockAutoCM).GetProperties().Select(p => p.Name));
    }

    [Fact]
    public void The_upload_is_rate_limited_and_size_capped()
    {
        var upload = typeof(MediaController).GetMethod(nameof(MediaController.Upload))!;

        Assert.Equal(RateLimitingExtensions.MediaUploadPolicy, upload.GetCustomAttribute<EnableRateLimitingAttribute>()?.PolicyName);
        // RequestSizeLimitAttribute keeps its byte count private; its presence is what matters —
        // without it Kestrel's 30 MB default applies.
        Assert.NotNull(upload.GetCustomAttribute<RequestSizeLimitAttribute>());
        Assert.Equal(MediaController.MaxRequestBytes, upload.GetCustomAttribute<RequestFormLimitsAttribute>()?.MultipartBodyLengthLimit);
    }

    /// <summary>
    /// Before the media pipeline, a question or quiz save took an image URL straight from the
    /// client and stored it — any string, shown to every player: a tracking pixel, another site's
    /// image, a <c>javascript:</c> URL. Media is now attached by asset id and the server writes the
    /// URL. A URL-shaped property on any write model would reopen that, so none may exist.
    /// </summary>
    [Theory]
    [InlineData(typeof(MultipleChoiceQuestionCM))]
    [InlineData(typeof(TrueFalseQuestionCM))]
    [InlineData(typeof(TypeTheAnswerQuestionCM))]
    [InlineData(typeof(MultipleChoiceQuestionUM))]
    [InlineData(typeof(TrueFalseQuestionUM))]
    [InlineData(typeof(TypeTheAnswerQuestionUM))]
    [InlineData(typeof(QuizCM))]
    [InlineData(typeof(QuizUM))]
    [InlineData(typeof(AiQuizImportCM))]
    [InlineData(typeof(AiImportQuestionCM))]
    [InlineData(typeof(AssociationQuizCM))]
    [InlineData(typeof(AssociationQuizUM))]
    public void No_write_model_accepts_a_media_url(Type model)
    {
        var urlish = model.GetProperties()
            .Where(p => p.Name.Contains("Url", StringComparison.OrdinalIgnoreCase)
                        || p.Name.Equals("MediaType", StringComparison.OrdinalIgnoreCase))
            .Select(p => p.Name)
            .ToList();

        Assert.Empty(urlish);
    }
}
