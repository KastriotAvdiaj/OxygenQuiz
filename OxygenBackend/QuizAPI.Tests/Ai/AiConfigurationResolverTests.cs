using QuizAPI.Services.Ai;
using Xunit;

namespace QuizAPI.Tests.Ai;

/// <summary>
/// The decision table behind "a broken AI configuration switches the feature off, it does not stop
/// the app" (docs/adr/0004-ai-misconfiguration-disables-the-feature.md).
///
/// <para>Two properties are worth more than the individual cases and are asserted throughout:
/// <b>no input ever throws</b> — that is the whole point of the change, and a resolver that throws
/// on some unanticipated combination silently restores the old behaviour — and <b>unavailable
/// implies <c>Enabled == false</c></b>, because that flag is the single gate every consumer reads.
/// A resolver that reported unavailable without clearing the flag would leave the wizard offering a
/// button that reaches a provider which cannot work.</para>
/// </summary>
public class AiConfigurationResolverTests
{
    private static AiVendorOptions Groq() => new()
    {
        BaseUrl = "https://api.groq.com/openai/v1",
        Model = "openai/gpt-oss-120b",
        ReasoningEffort = "low",
        InputCostPerMillionUsd = 0.15m,
        OutputCostPerMillionUsd = 0.60m,
    };

    private static AiOptions Configured(string vendor = "groq", bool enabled = true)
    {
        var options = new AiOptions { Enabled = enabled, Vendor = vendor, ApiKey = "key" };
        options.Vendors["groq"] = Groq();
        return options;
    }

    private static AiConfigurationResult Resolve(
        AiOptions options, bool isProduction = true, bool isDevelopment = false) =>
        AiConfigurationResolver.Apply(options, isProduction, isDevelopment);

    // ── The happy path, and the resolution that makes it one ────────────────────────────────

    [Fact]
    public void Selected_vendor_is_copied_onto_the_flat_properties()
    {
        var options = Configured();

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Ready, result.Availability.Status);
        Assert.True(options.Enabled);
        Assert.Equal("https://api.groq.com/openai/v1", options.BaseUrl);
        Assert.Equal("openai/gpt-oss-120b", options.Model);
        Assert.Equal("low", options.ReasoningEffort);
        Assert.Equal(0.15m, options.InputCostPerMillionUsd);
        Assert.Equal(0.60m, options.OutputCostPerMillionUsd);
    }

    [Fact]
    public void Vendor_selection_is_case_insensitive()
    {
        // Ai__Vendor=GROQ from a shell is the same choice as "groq" in a file, and a deploy that
        // differs only in case must not silently take the AI down.
        var options = Configured(vendor: "GROQ");

        Assert.Equal(AiConfigStatus.Ready, Resolve(options).Availability.Status);
    }

    // ── Misconfiguration degrades; it never throws and never stays enabled ───────────────────

    [Theory]
    [InlineData("deepseek")]  // a real vendor, but not one in this catalogue
    [InlineData("groqq")]     // a typo
    public void Unknown_vendor_switches_the_feature_off(string vendor)
    {
        var options = Configured(vendor: vendor);

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Misconfigured, result.Availability.Status);
        Assert.False(options.Enabled);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public void A_catalogue_that_nothing_selects_is_refused()
    {
        // The partial-override bug wearing a new hat: it looks configured, and would run on
        // whatever the flat keys happened to hold.
        var options = Configured(vendor: "");

        Assert.Equal(AiConfigStatus.Misconfigured, Resolve(options).Availability.Status);
    }

    [Theory]
    [InlineData("baseurl")]
    [InlineData("model")]
    [InlineData("input")]
    [InlineData("output")]
    public void An_incomplete_vendor_entry_is_refused(string missing)
    {
        var vendor = Groq();
        switch (missing)
        {
            case "baseurl": vendor.BaseUrl = ""; break;
            case "model": vendor.Model = ""; break;
            // Zero is the dangerous one: it is not "free", it is "unpriced", and both budget caps
            // are enforced against it. Left as a default it would pass forever, silently.
            case "input": vendor.InputCostPerMillionUsd = 0m; break;
            case "output": vendor.OutputCostPerMillionUsd = 0m; break;
        }

        var options = new AiOptions { Enabled = true, Vendor = "groq", ApiKey = "key" };
        options.Vendors["groq"] = vendor;

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Misconfigured, result.Availability.Status);
        Assert.False(options.Enabled);
    }

    [Fact]
    public void A_non_absolute_base_url_is_refused()
    {
        var vendor = Groq();
        vendor.BaseUrl = "api.groq.com/openai/v1";  // no scheme
        var options = new AiOptions { Enabled = true, Vendor = "groq", ApiKey = "key" };
        options.Vendors["groq"] = vendor;

        Assert.Equal(AiConfigStatus.Misconfigured, Resolve(options).Availability.Status);
    }

    [Fact]
    public void A_provider_typo_switches_off_rather_than_making_paid_calls()
    {
        var options = Configured();
        options.Provider = "OpenAICompatable";

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Misconfigured, result.Availability.Status);
        Assert.False(options.Enabled);
    }

    [Fact]
    public void Missing_key_in_production_switches_the_feature_off()
    {
        var options = Configured();
        options.ApiKey = "";

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Misconfigured, result.Availability.Status);
        Assert.False(options.Enabled);
    }

    // ── The stub ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Missing_key_in_development_falls_back_to_the_stub()
    {
        // appsettings.Development.json is committed with Ai:Enabled=true, so every fresh clone
        // inherits it with no user-secrets. Switching AI off there would hide the feature from
        // people who never opted into it.
        var options = Configured();
        options.ApiKey = "";

        var result = Resolve(options, isProduction: false, isDevelopment: true);

        Assert.Equal(AiConfigStatus.FakeStub, result.Availability.Status);
        Assert.True(result.UseFakeProvider);
        Assert.True(options.Enabled);
    }

    [Fact]
    public void The_stub_is_refused_in_production_by_switching_off_not_by_throwing()
    {
        // Canned questions served as real ones are worse than no feature. But the site staying up
        // matters more than making that point loudly, so this is an off switch, not an exception.
        var options = Configured();
        options.Provider = "Fake";

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Misconfigured, result.Availability.Status);
        Assert.False(result.UseFakeProvider);
        Assert.False(options.Enabled);
    }

    [Fact]
    public void The_stub_needs_no_key_outside_production()
    {
        var options = Configured();
        options.Provider = "Fake";
        options.ApiKey = "";

        var result = Resolve(options, isProduction: false, isDevelopment: true);

        Assert.Equal(AiConfigStatus.FakeStub, result.Availability.Status);
        Assert.True(result.UseFakeProvider);
    }

    // ── Switched off on purpose is not an error ─────────────────────────────────────────────

    [Fact]
    public void Switched_off_reports_off_not_broken()
    {
        var result = Resolve(Configured(enabled: false));

        Assert.Equal(AiConfigStatus.SwitchedOff, result.Availability.Status);
        Assert.Equal(AiConfigurationResolver.SwitchedOffMessage, result.Availability.UserMessage);
        Assert.Null(result.Error);
    }

    [Fact]
    public void Switched_off_and_broken_is_a_warning_not_an_error()
    {
        // Nothing was going to run either way, so this must not page anyone — but it is still
        // worth saying once, so it is found before the switch is flipped rather than after.
        var options = Configured(vendor: "nonexistent", enabled: false);

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.SwitchedOff, result.Availability.Status);
        Assert.Null(result.Error);
        Assert.Contains(result.Warnings, w => w.Contains("configuration is also invalid"));
    }

    // ── Back-compatibility with what is deployed today ──────────────────────────────────────

    [Fact]
    public void The_flat_vendor_form_still_works_and_says_it_is_deprecated()
    {
        // A server whose compose file sets Ai__BaseUrl and Ai__Model must not lose its AI the
        // moment it pulls this change.
        var options = new AiOptions
        {
            Enabled = true,
            ApiKey = "key",
            BaseUrl = "https://api.groq.com/openai/v1",
            Model = "openai/gpt-oss-120b",
            InputCostPerMillionUsd = 0.15m,
            OutputCostPerMillionUsd = 0.60m,
        };

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Ready, result.Availability.Status);
        Assert.Contains(result.Warnings, w => w.Contains("deprecated"));
    }

    [Fact]
    public void A_legacy_vendor_name_in_Provider_still_boots_with_a_warning()
    {
        var options = Configured();
        options.Provider = "DeepSeek";

        var result = Resolve(options);

        Assert.Equal(AiConfigStatus.Ready, result.Availability.Status);
        Assert.Contains(result.Warnings, w => w.Contains("names a vendor"));
    }

    // ── The two invariants ──────────────────────────────────────────────────────────────────

    [Fact]
    public void Unavailable_always_implies_the_gate_is_closed()
    {
        foreach (var options in BrokenConfigurations())
        {
            var result = Resolve(options);

            if (!result.IsAvailable)
                Assert.False(options.Enabled,
                    "An unavailable AI configuration must leave Ai:Enabled false — that flag is " +
                    "the single gate every consumer reads.");
        }
    }

    [Fact]
    public void No_configuration_throws()
    {
        foreach (var options in BrokenConfigurations())
        {
            var exception = Record.Exception(() => Resolve(options));
            Assert.Null(exception);
        }
    }

    private static IEnumerable<AiOptions> BrokenConfigurations()
    {
        yield return new AiOptions();                                    // nothing configured at all
        yield return new AiOptions { Enabled = true };                   // on, with nothing behind it
        yield return new AiOptions { Enabled = true, Provider = "" };
        yield return new AiOptions { Enabled = true, Provider = "nonsense", ApiKey = "key" };
        yield return new AiOptions { Enabled = true, Provider = "Fake" };
        yield return new AiOptions { Enabled = true, Vendor = "missing", ApiKey = "key" };
        yield return Configured(vendor: "missing");
        yield return Configured(vendor: "");

        var blankKey = Configured();
        blankKey.ApiKey = "   ";
        yield return blankKey;

        var zeroCost = Configured();
        zeroCost.Vendors["groq"].InputCostPerMillionUsd = 0m;
        yield return zeroCost;
    }
}
