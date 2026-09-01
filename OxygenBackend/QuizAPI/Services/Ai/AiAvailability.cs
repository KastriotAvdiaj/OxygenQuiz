namespace QuizAPI.Services.Ai
{
    /// <summary>Why the AI features are, or are not, usable right now.</summary>
    public enum AiConfigStatus
    {
        /// <summary>Configured against a real vendor.</summary>
        Ready,

        /// <summary>Running the offline stub. Development only — refused in Production.</summary>
        FakeStub,

        /// <summary>Somebody turned it off on purpose. Not an error, and not logged as one.</summary>
        SwitchedOff,

        /// <summary>Turned on, but the configuration cannot produce a working call.</summary>
        Misconfigured,
    }

    /// <summary>
    /// The answer to "can the AI features work at all", resolved once at startup and registered as
    /// a singleton. Configuration does not change at runtime, so neither does this.
    ///
    /// <para><b>This is for telling people, not for gating.</b> The gate is
    /// <see cref="AiOptions.Enabled"/>, which <see cref="AiConfigurationResolver"/> forces to
    /// false whenever this says unavailable — so every existing check keeps working and there is
    /// no second condition to remember to mirror. What this adds is a *reason* the UI can show,
    /// which a bare false cannot carry.</para>
    ///
    /// <para><b>Why <see cref="UserMessage"/> is vague about misconfiguration.</b> It reaches an
    /// admin's screen through an API response. "AI features are unavailable right now" is all the
    /// reader can act on anyway; which key is blank belongs in the server log, where it is written
    /// in full at startup and cannot be read by anyone who should not see it.</para>
    /// </summary>
    public sealed record AiAvailability(AiConfigStatus Status, string UserMessage)
    {
        /// <summary>True when a generation would actually be attempted, stub included.</summary>
        public bool IsAvailable => Status is AiConfigStatus.Ready or AiConfigStatus.FakeStub;
    }
}
