using System.Net;
using System.Text;

namespace QuizAPI.Services.Email
{
    /// <summary>
    /// Builds the one email shape this app sends: a sentence, a button, and a note about the link.
    ///
    /// <para><b>Everything interpolated is HTML-encoded.</b> The templates this replaced pasted
    /// <c>user.Username</c> straight into the markup, and a username is chosen by the user. A
    /// display name of <c>&lt;a href="…"&gt;click here&lt;/a&gt;</c> would have injected an
    /// attacker's link into a password-reset email — DKIM-signed by our own domain, so it passes
    /// every check a recipient's mail client makes. That is a phishing primitive, not a formatting
    /// bug, and encoding is the fix rather than validating usernames at signup.</para>
    ///
    /// <para><b>Why tables and inline styles</b>, in 2026: Outlook on Windows still renders mail
    /// through Word's HTML engine, which ignores most modern layout. A table with inline styles is
    /// the only construction that survives every mainstream client. There are no images, so nothing
    /// breaks when a client blocks remote content by default — which most do.</para>
    /// </summary>
    public static class EmailTemplates
    {
        /// <summary>The app's --primary, as a literal: email has no CSS variables.</summary>
        private const string Primary = "#2563eb";

        /// <summary>
        /// Returns the HTML and plain-text bodies for an action email.
        /// </summary>
        /// <param name="preheader">
        /// The grey line an inbox shows after the subject. Without one, clients scrape the first
        /// text in the body — usually "Hi Kastriot," — and waste the most valuable line in the
        /// whole message. It is hidden in the rendered email.
        /// </param>
        public static (string Html, string Text) Action(
            string recipientName,
            string preheader,
            string intro,
            string buttonLabel,
            string url,
            string footer)
        {
            var name = WebUtility.HtmlEncode(recipientName);
            var pre = WebUtility.HtmlEncode(preheader);
            var body = WebUtility.HtmlEncode(intro);
            var label = WebUtility.HtmlEncode(buttonLabel);
            var note = WebUtility.HtmlEncode(footer);
            var href = WebUtility.HtmlEncode(url);

            var html = $"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Oxygen Quiz</title>
                </head>
                <body style="margin:0;padding:0;background:#f4f5f7;">
                  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{pre}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
                          <tr>
                            <td style="padding:28px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                              <p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:{Primary};letter-spacing:.02em;">Oxygen Quiz</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111827;">
                              <p style="margin:12px 0;">Hi {name},</p>
                              <p style="margin:12px 0;">{body}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:12px 32px 4px 32px;">
                              <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td bgcolor="{Primary}" style="border-radius:8px;">
                                    <a href="{href}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">{label}</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:16px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
                              <p style="margin:0 0 6px 0;">If the button doesn't work, copy this link into your browser:</p>
                              <p style="margin:0 0 4px 0;word-break:break-all;"><a href="{href}" style="color:{Primary};text-decoration:underline;">{href}</a></p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:16px 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #f3f4f6;">
                              <p style="margin:14px 0 0 0;">{note}</p>
                            </td>
                          </tr>
                        </table>
                        <p style="max-width:520px;margin:14px auto 0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#9ca3af;text-align:center;">
                          Oxygen Quiz &middot; oxygenquiz.com
                        </p>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;

            // The plain-text alternative is not a courtesy. A message with no text part looks more
            // like bulk mail to spam filters, and the URL has to be readable to anyone whose client
            // does not render HTML at all. Raw values here, deliberately — encoding is an HTML
            // concern and "&amp;" in a pasted URL is a broken link.
            var text = new StringBuilder()
                .AppendLine($"Hi {recipientName},")
                .AppendLine()
                .AppendLine(intro)
                .AppendLine()
                .AppendLine(url)
                .AppendLine()
                .AppendLine(footer)
                .AppendLine()
                .AppendLine("— Oxygen Quiz")
                .ToString();

            return (html, text);
        }
    }
}
