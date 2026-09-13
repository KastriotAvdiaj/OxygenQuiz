namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Where the frontend lives, for links that leave the API — every one of them is in an email, so
    /// a wrong answer here is only discovered by a person who clicks a dead link in their inbox.
    ///
    /// <para>It is one function rather than a copy per caller because the fallback chain is the
    /// fragile part: in production only <c>App:FrontendBaseUrl</c> is right, but development often
    /// sets neither it nor CORS, and a mail with <c>https://localhost:5173</c> in it is obviously
    /// wrong while a mail pointing at the API's own origin looks plausible and fails quietly.</para>
    /// </summary>
    public static class AppLinks
    {
        /// <summary>
        /// Prefer an explicit <c>App:FrontendBaseUrl</c>, else the first configured CORS origin
        /// (which in every deployment so far IS the frontend), else the local dev default.
        /// </summary>
        public static string FrontendBaseUrl(IConfiguration configuration) =>
            configuration["App:FrontendBaseUrl"]
            ?? configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault()
            ?? "https://localhost:5173";
    }
}
