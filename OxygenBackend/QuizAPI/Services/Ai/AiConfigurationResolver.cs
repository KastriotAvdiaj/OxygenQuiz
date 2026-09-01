namespace QuizAPI.Services.Ai
{
    /// <param name="Availability">What to tell callers, and what the UI shows.</param>
    /// <param name="UseFakeProvider">True when the offline stub should be registered.</param>
    /// <param name="Warnings">Log at Warning. Configuration that works but should not stay.</param>
    /// <param name="Error">Log at Error. The reason the feature was switched off. Null when fine.</param>
    public sealed record AiConfigurationResult(
        AiAvailability Availability,
        bool UseFakeProvider,
        IReadOnlyList<string> Warnings,
        string? Error)
    {
        public bool IsAvailable => Availability.IsAvailable;
    }

    /// <summary>
    /// Decides, once at startup, whether the AI configuration can produce a working call — and,
    /// when it cannot, switches the feature off instead of stopping the application.
    ///
    /// <para><b>Why this is not a startup throw any more.</b> It used to be, on the same fail-fast
    /// reasoning as the <c>Jwt:Key</c> guard, and for a secret that reasoning is right: an API with
    /// no signing key cannot do its job, so refusing to start is the honest outcome. AI generation
    /// is not like that. It is one optional feature among many, and the rest of OxygenQuiz —
    /// playing, authoring, grading, accounts — has no dependency on it whatsoever. Taking the whole
    /// site down because a vendor key was mistyped trades a small outage for a total one, and it
    /// does so at the worst moment, since a bad AI value is most likely to be introduced during a
    /// production config edit. So the feature degrades and the site stays up.</para>
    ///
    /// <para><b>Degrading is only honest if it reaches the user.</b> The rule this class enforces
    /// is that an unavailable feature is switched off at the source: it sets
    /// <see cref="AiOptions.Enabled"/> to false, which is the flag <see cref="AiGenerationService"/>
    /// and <see cref="CategoryPalette.CategoryPaletteService"/> already gate on, which
    /// <c>GET /api/quiz/ai-quota</c> already reports, and which the wizard already uses to disable
    /// its Generate button. One choke point, so there is no third condition to mirror into the two
    /// gates that carry a comment begging the next reader to remember. What is added is
    /// <see cref="AiAvailability"/>, carrying a reason a bare <c>false</c> cannot.</para>
    ///
    /// <para><b>The stub is not a fallback in Production.</b> Fake questions served as real ones
    /// are worse than no feature, so <c>Ai:Provider = "Fake"</c> is refused there — and refused by
    /// switching AI off, not by refusing to boot.</para>
    ///
    /// <para>Pure and static so the whole decision table is unit-testable without a host: see
    /// <c>AiConfigurationResolverTests</c>.</para>
    /// </summary>
    public static class AiConfigurationResolver
    {
        /// <summary>Shown when someone turned the feature off deliberately.</summary>
        public const string SwitchedOffMessage = "AI features are switched off.";

        /// <summary>
        /// Shown when the configuration is broken. Deliberately says nothing about which key —
        /// this reaches a browser, and the detail is in the server log where it belongs.
        /// </summary>
        public const string UnavailableMessage = "AI features are unavailable right now.";

        /// <summary>
        /// Resolves the selected vendor onto <paramref name="options"/> and returns what the host
        /// should register and log. <b>Mutates <paramref name="options"/></b> — that is the point:
        /// it is called from <c>PostConfigure</c>, so every later reader sees resolved values and
        /// an <see cref="AiOptions.Enabled"/> that already accounts for whether they are usable.
        /// </summary>
        public static AiConfigurationResult Apply(AiOptions options, bool isProduction, bool isDevelopment)
        {
            var warnings = new List<string>();
            string? error = null;
            var useFake = false;

            // ── 1. Transport. "How we fetch a completion", never "from whom".
            var providerName = string.IsNullOrWhiteSpace(options.Provider)
                ? "OpenAiCompatible"
                : options.Provider.Trim();

            // Legacy vendor names still boot: an existing .env holding "DeepSeek" predates the
            // 2026-08-22 rename, and switching AI off over it would punish the wrong mistake.
            var isLegacyVendorName = Eq(providerName, "DeepSeek") || Eq(providerName, "Qwen");
            if (isLegacyVendorName)
                warnings.Add(
                    $"Ai:Provider is \"{providerName}\", which names a vendor. The provider is chosen by " +
                    "transport, not by vendor: set Ai:Provider to \"OpenAiCompatible\" and choose the " +
                    "vendor with Ai:Vendor. The legacy value still works.");

            if (Eq(providerName, "Fake"))
            {
                if (isProduction)
                    error = "Ai:Provider is \"Fake\", a development-only stub that invents questions. " +
                            "It must never run in Production, so the AI features are switched off instead.";
                else
                    useFake = true;
            }
            else if (!Eq(providerName, "OpenAiCompatible") && !isLegacyVendorName)
            {
                // A typo used to fall through to "make real paid calls", which is the wrong default
                // for a typo. It now falls through to "off", which is the right one.
                error = $"Ai:Provider is \"{providerName}\", which is not a provider. Use " +
                        "\"OpenAiCompatible\" for a real vendor (chosen with Ai:Vendor) or \"Fake\" " +
                        "for development.";
            }

            // ── 2. Vendor. Five values that are one decision — see AiVendorOptions.
            if (error is null && !useFake)
                error = ResolveVendor(options, warnings);

            // ── 3. Key. Development keeps the old, deliberate exemption.
            if (error is null && !useFake && string.IsNullOrWhiteSpace(options.ApiKey))
            {
                if (isDevelopment)
                {
                    // appsettings.Development.json is COMMITTED, so its Ai:Enabled=true is inherited
                    // by every fresh clone, none of which has user-secrets. Switching AI off there
                    // would hide the feature from everyone who never opted into it; the stub shows
                    // it working instead. Adding Ai__ApiKey is then the only step to go real.
                    useFake = true;
                    warnings.Add(
                        "Ai:Enabled is true but no Ai:ApiKey is configured — using the Fake provider. " +
                        "To call the real vendor: dotnet user-secrets set \"Ai:ApiKey\" \"<key>\"");
                }
                else
                {
                    error = "Ai:Enabled is true but Ai:ApiKey is not configured. Supply it via the " +
                            "Ai__ApiKey environment variable or user-secrets.";
                }
            }

            // ── 4. Verdict, and the single choke point that enforces it.
            AiConfigStatus status;

            if (!options.Enabled)
            {
                // Off on purpose. A configuration problem here is worth saying once, but it is not
                // an outage and must not be logged as one — nothing was going to run either way.
                status = AiConfigStatus.SwitchedOff;
                if (error is not null)
                {
                    warnings.Add($"AI is switched off, and its configuration is also invalid: {error}");
                    error = null;
                }
                useFake = false;
            }
            else if (error is not null)
            {
                status = AiConfigStatus.Misconfigured;
                options.Enabled = false;
                useFake = false;
            }
            else
            {
                status = useFake ? AiConfigStatus.FakeStub : AiConfigStatus.Ready;
            }

            var message = status switch
            {
                AiConfigStatus.SwitchedOff => SwitchedOffMessage,
                AiConfigStatus.Misconfigured => UnavailableMessage,
                _ => string.Empty,
            };

            return new AiConfigurationResult(
                new AiAvailability(status, message), useFake, warnings, error);
        }

        /// <summary>
        /// Copies the selected <c>Ai:Vendors</c> entry onto the flat properties every consumer
        /// already reads, then checks the result is complete. Returns null when fine, or the
        /// reason it is not.
        /// </summary>
        private static string? ResolveVendor(AiOptions options, List<string> warnings)
        {
            var key = options.Vendor?.Trim();
            string source;

            if (!string.IsNullOrEmpty(key))
            {
                if (!options.Vendors.TryGetValue(key, out var vendor))
                {
                    var known = options.Vendors.Count == 0
                        ? "the catalogue is empty"
                        : string.Join(", ", options.Vendors.Keys.OrderBy(k => k, StringComparer.OrdinalIgnoreCase));
                    return $"Ai:Vendor is \"{key}\", which is not an entry in Ai:Vendors ({known}).";
                }

                options.BaseUrl = vendor.BaseUrl;
                options.Model = vendor.Model;
                options.ReasoningEffort = vendor.ReasoningEffort;
                options.InputCostPerMillionUsd = vendor.InputCostPerMillionUsd;
                options.OutputCostPerMillionUsd = vendor.OutputCostPerMillionUsd;
                source = $"Ai:Vendors:{key}";
            }
            else if (options.Vendors.Count > 0)
            {
                // A catalogue nobody selects from is the partial-override bug wearing a new hat:
                // it looks configured and runs on whatever the flat keys happen to hold.
                return "Ai:Vendors is configured but Ai:Vendor names none of them. Set Ai:Vendor to " +
                       $"one of: {string.Join(", ", options.Vendors.Keys.OrderBy(k => k, StringComparer.OrdinalIgnoreCase))}.";
            }
            else
            {
                warnings.Add(
                    "The AI vendor is configured through the flat Ai:BaseUrl / Ai:Model / cost keys. " +
                    "That form is deprecated because the five values must move together and nothing " +
                    "enforces it — define an Ai:Vendors entry and select it with Ai:Vendor instead.");
                source = "the flat Ai:* keys";
            }

            var missing = new List<string>();
            if (string.IsNullOrWhiteSpace(options.BaseUrl))
                missing.Add("BaseUrl");
            else if (!Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out _))
                missing.Add($"BaseUrl (\"{options.BaseUrl}\" is not an absolute URL)");

            if (string.IsNullOrWhiteSpace(options.Model)) missing.Add("Model");

            // Zero is not "free", it is "unpriced": it would record every generation as costing
            // nothing, and both budget caps are enforced against that number. Silent, and the most
            // expensive kind of silent, so it is a hard requirement rather than a default.
            if (options.InputCostPerMillionUsd <= 0) missing.Add("InputCostPerMillionUsd");
            if (options.OutputCostPerMillionUsd <= 0) missing.Add("OutputCostPerMillionUsd");

            return missing.Count == 0
                ? null
                : $"The AI vendor from {source} is incomplete: {string.Join(", ", missing)}. " +
                  "A vendor needs all five of BaseUrl, Model, both cost-per-million rates, and " +
                  "ReasoningEffort where the model requires one.";
        }

        private static bool Eq(string a, string b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
    }
}
