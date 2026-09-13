using QuizAPI.DTOs.User;

namespace QuizAPI.DTOs.Authentication
{
    public class AuthResponseDTO
    {
        public string Token { get; set; } = string.Empty;
        public UserDTO User { get; set; } = null!;

        /// <summary>
        /// True when this sign-in cancelled a pending account closure (ADR 0012). The recovery
        /// itself is silent — the account is simply restored — and a person who left, changed their
        /// mind and came back deserves to be told it worked rather than having to close the account
        /// again to find out. False on every ordinary sign-in, which is nearly all of them.
        ///
        /// <para>Safe to send: it only ever reaches the person who just proved they own the
        /// account, and it says nothing they did not already do themselves.</para>
        /// </summary>
        public bool ClosureCancelled { get; set; }
    }
}
