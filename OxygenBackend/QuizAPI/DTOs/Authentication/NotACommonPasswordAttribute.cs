using System.ComponentModel.DataAnnotations;

namespace QuizAPI.DTOs.Authentication
{
    /// <summary>
    /// Rejects passwords that appear on a local blocklist of the most common / most-breached
    /// passwords, plus a few trivially-weak patterns (single repeated character, obvious
    /// keyboard/numeric runs).
    ///
    /// This follows current guidance (NIST 800-63B): screen new passwords against known-bad lists
    /// instead of forcing composition rules (mixed case / symbols), which push users toward
    /// predictable patterns without adding real strength. The embedded list is intentionally small
    /// and self-contained (no network call, no large dataset shipped); if stronger coverage is ever
    /// needed, swap this check for a lookup against the full "Have I Been Pwned" Pwned Passwords
    /// dataset (local copy or its k-anonymity range API) — see docs/deployment/known-issues.md.
    /// </summary>
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
    public sealed class NotACommonPasswordAttribute : ValidationAttribute
    {
        // A curated subset of the most frequently breached passwords. Lower-cased; comparison is
        // case-insensitive, so "Password1" is caught by "password1".
        private static readonly HashSet<string> CommonPasswords = new(StringComparer.OrdinalIgnoreCase)
        {
            "123456", "123456789", "12345678", "1234567890", "1234567", "12345",
            "111111", "000000", "121212", "123123", "654321", "666666", "112233",
            "password", "password1", "password123", "passw0rd", "passw0rd1",
            "qwerty", "qwerty123", "qwertyuiop", "qwerty1", "1q2w3e4r", "1q2w3e4r5t",
            "asdfghjkl", "zxcvbnm", "qazwsx", "abc123", "abc12345", "a1b2c3d4",
            "iloveyou", "admin", "administrator", "welcome", "welcome1", "welcome123",
            "letmein", "monkey", "dragon", "sunshine", "princess", "football",
            "baseball", "superman", "batman", "trustno1", "master", "shadow",
            "michael", "jennifer", "computer", "starwars", "whatever", "freedom",
            "changeme", "changeme123", "secret", "login", "test123", "temp1234",
            "google", "samsung", "internet", "mypassword", "password!", "p@ssword",
            "p@ssw0rd", "qwe123", "asd123", "zxc123", "1qaz2wsx", "5201314",
            "11111111", "00000000", "aaaaaa", "123qwe", "qwertyu", "1234qwer",
        };

        // Override the ValidationContext form (not the bool one) so we can return a per-failure
        // message without mutating the shared attribute instance's ErrorMessage across requests.
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is not string password || string.IsNullOrEmpty(password))
                return ValidationResult.Success; // [Required]/[MinLength] own the empty case.

            // A single character repeated (e.g. "aaaaaaaaaaaa") or a known common/breached password.
            if (password.Distinct().Count() == 1 || CommonPasswords.Contains(password))
            {
                return new ValidationResult(
                    "This password is too common or predictable. Please choose a stronger one.",
                    validationContext.MemberName is { } member ? new[] { member } : null);
            }

            return ValidationResult.Success;
        }
    }
}
