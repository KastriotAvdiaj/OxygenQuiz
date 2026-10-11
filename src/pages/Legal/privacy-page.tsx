import { LEGAL_ENTITY } from "./legal-entity";
import { LegalLink, LegalList, LegalPage, LegalSection, MailLink } from "./legal-page";

/**
 * What is collected, why, who it goes to and where. Mirrors the table in
 * docs/proposals/legal-and-compliance-for-launch.md §3 — a new processor or a new kind of data
 * is a row here in the same change.
 */
const DATA_ROWS: { data: string; why: string; sharedWith: string; where: string }[] = [
  {
    data: "Email, username, password hash, profile image",
    why: "Your account",
    sharedWith: "Hetzner (hosting), Brevo (emails)",
    where: "EU",
  },
  {
    data: "Google account id, name and email, if you sign in with Google",
    why: "Signing in",
    sharedWith: "Google",
    where: "US",
  },
  { data: "Quizzes, questions and uploads", why: "The service", sharedWith: "Hetzner", where: "EU" },
  {
    data: "Play history, answers and scores",
    why: "Your stats and history; analytics for the quiz's owner",
    sharedWith: "Hetzner",
    where: "EU",
  },
  {
    data: "Text you give the AI generator",
    why: "Generating questions",
    sharedWith: "Our AI provider (Groq)",
    where: "US",
  },
  {
    data: "Pupils' first names in a Class",
    why: "Host mode, for the teacher who entered them",
    sharedWith: "Hetzner",
    where: "EU",
  },
  {
    data: "IP address and request logs",
    why: "Security and rate limiting",
    sharedWith: "Cloudflare",
    where: "Global",
  },
  {
    data: "Payment details, billing address, VAT details",
    why: "Buying a plan",
    sharedWith: "Paddle, as the seller. We never see card numbers.",
    where: "UK, EU, US",
  },
];

/** Everything the app stores in the browser. None of it is analytics or advertising. */
const STORAGE_ROWS: { what: string; purpose: string }[] = [
  { what: "Refresh-token cookie", purpose: "Keeps you signed in" },
  { what: "has_session cookie", purpose: "Tells the app whether to try signing you in silently" },
  { what: "guest_played cookie (1 year)", purpose: "The one free quiz for visitors without an account" },
  { what: "Local storage: theme", purpose: "The light or dark theme you chose" },
  { what: "Local storage: drafts", purpose: "Unsaved quizzes you are writing" },
  { what: "Local storage: dismissed tips", purpose: "So a tip you closed stays closed" },
  { what: "Session storage: current lobby", purpose: "Rejoining a live game after a refresh" },
];

const cell = "border-b border-foreground/15 px-3 py-2 align-top";
const headCell = "border-b border-foreground/30 px-3 py-2 text-left font-semibold";

/** `/privacy` — docs/proposals/legal-and-compliance-for-launch.md §2.1 and §3. */
export const PrivacyPage = () => (
  <LegalPage title="Privacy Policy" versioned>
    <LegalSection title="1. Who is responsible">
      <p>
        {LEGAL_ENTITY.operatorName}, {LEGAL_ENTITY.location}, runs {LEGAL_ENTITY.productName} and
        is responsible for the
        personal data described here. Contact: <MailLink address={LEGAL_ENTITY.privacyEmail} />.
      </p>
    </LegalSection>

    <LegalSection title="2. What we collect, why, and who receives it">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr>
              <th className={headCell}>Data</th>
              <th className={headCell}>Why</th>
              <th className={headCell}>Shared with</th>
              <th className={headCell}>Where</th>
            </tr>
          </thead>
          <tbody>
            {DATA_ROWS.map((row) => (
              <tr key={row.data}>
                <td className={cell}>{row.data}</td>
                <td className={cell}>{row.why}</td>
                <td className={cell}>{row.sharedWith}</td>
                <td className={cell}>{row.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        We do not sell personal data, and we do not use it for advertising. We use it to run the
        service you asked for, to keep it secure, and to meet our legal obligations.
      </p>
      <p>
        Please do not include personal information in the text you give the AI generator. That
        text is sent to our AI provider to produce the questions.
      </p>
    </LegalSection>

    <LegalSection title="3. Children and classes">
      <p>
        Accounts are for people aged 16 and over, or 13 to 15 with the permission of a parent or
        teacher. Pupils taking part in a game their teacher hosts do not need an account, and the
        screen a class watches needs no sign-in at all.
      </p>
      <p>
        The first names a teacher enters for a Class are kept only for that teacher, are never
        shown publicly, and are deleted with the teacher's account.
      </p>
    </LegalSection>

    <LegalSection title="4. Transfers outside your country">
      <p>
        Our servers are in the European Union. Some of the providers above process data in the
        United States or the United Kingdom. Where data leaves the EU, it is covered by the
        provider's standard contractual clauses or an equivalent safeguard.
      </p>
    </LegalSection>

    <LegalSection title="5. How long we keep it">
      <LegalList>
        <li>Account data: for as long as you have an account.</li>
        <li>
          After you close your account: 30 days, during which you can restore it. Then your
          personal details are removed and what remains can no longer be linked to you.
        </li>
        <li>
          Records of purchases are kept as the law on financial records requires. They hold no
          name or email; those are with Paddle.
        </li>
        <li>Security logs: for a short period, then deleted.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="6. Cookies and browser storage">
      <p>
        We use no analytics, advertising or tracking cookies, so there is no cookie banner.
        Everything stored in your browser is needed to run the service or is a preference you set:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr>
              <th className={headCell}>Stored</th>
              <th className={headCell}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {STORAGE_ROWS.map((row) => (
              <tr key={row.what}>
                <td className={cell}>{row.what}</td>
                <td className={cell}>{row.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The pricing page loads Paddle's checkout script, and the sign-in pages load Google's
        sign-in button. Both come from those companies' servers, which see your IP address when
        they load.
      </p>
    </LegalSection>

    <LegalSection title="7. Your rights">
      <p>You can ask us to:</p>
      <LegalList>
        <li>tell you what data we hold about you and give you a copy of it;</li>
        <li>correct data that is wrong;</li>
        <li>delete your data — closing your account in your settings does this;</li>
        <li>stop or restrict a particular use of your data.</li>
      </LegalList>
      <p>
        Write to <MailLink address={LEGAL_ENTITY.privacyEmail} />. We reply within 30 days. You can
        also complain to Kosovo's Information and Privacy Agency or, if you live in the EU, to the
        data protection authority of your country.
      </p>
    </LegalSection>

    <LegalSection title="8. Changes">
      <p>
        When this policy changes materially we update the version above and tell signed-in users.
        See also our <LegalLink to="/terms">Terms of Service</LegalLink>.
      </p>
    </LegalSection>
  </LegalPage>
);
