namespace QuizAPI.Services
{
    /// <summary>
    /// A single, fixed, shared "system" user row that every guest-play session is attached to
    /// (the <c>UserId</c> foreign key on <c>QuizSession</c> is non-nullable, so guest sessions
    /// need a real row to point at — they don't get their own per-guest account).
    /// Seeded once by <see cref="DbSeeder"/>. See docs/auth/guest-play.md for the full design.
    /// </summary>
    public static class GuestAccount
    {
        /// <summary>Fixed id so every environment's seeded guest row is the same well-known account.</summary>
        public static readonly Guid Id = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public const string ImmutableName = "guest";
        public const string Username = "guest";
        public const string Email = "guest@oxygenquiz.internal";
    }
}
