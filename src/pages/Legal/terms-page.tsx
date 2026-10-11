import { LEGAL_ENTITY } from "./legal-entity";
import { ExternalLegalLink, LegalLink, LegalList, LegalPage, LegalSection, MailLink } from "./legal-page";

/** `/terms` — docs/proposals/legal-and-compliance-for-launch.md §2.1. */
export const TermsPage = () => (
  <LegalPage title="Terms of Service" versioned>
    <LegalSection title="1. Who we are">
      <p>
        {LEGAL_ENTITY.productName} is a quiz platform: you can play quizzes alone or live with
        others, create your own by hand or with AI assistance, and host games for a class. It is
        run by {LEGAL_ENTITY.operatorName}, {LEGAL_ENTITY.location}. "We" and "us" mean the
        operator of {LEGAL_ENTITY.productName}.
      </p>
      <p>
        By creating an account or using {LEGAL_ENTITY.productName} you agree to these terms. If
        you do not agree, please do not use the service.
      </p>
    </LegalSection>

    <LegalSection title="2. Who may use it">
      <p>
        Accounts are for people aged 16 and over, or aged 13 to 15 with the permission of a parent
        or teacher. Pupils can take part in a game their teacher hosts without having an account.
      </p>
    </LegalSection>

    <LegalSection title="3. Your account">
      <LegalList>
        <li>Give accurate information and keep your sign-in details to yourself.</li>
        <li>You are responsible for what happens under your account.</li>
        <li>
          You can close your account at any time from your account settings. It is removed after a
          30-day grace period, during which you can restore it.
        </li>
      </LegalList>
    </LegalSection>

    <LegalSection title="4. Your content">
      <p>
        You own the quizzes, questions and images you create or upload. You give us a
        non-exclusive licence to store them and to show them to the people you make them available
        to — everyone, for a public quiz — for as long as they are on the service.
      </p>
      <LegalList>
        <li>
          Only upload, or paste into the AI generator, material you have the right to use.
        </li>
        <li>No content that is illegal, hateful, harassing, sexually explicit, or that infringes
          someone else's rights.</li>
        <li>No attempts to break, overload or get around the limits of the service.</li>
      </LegalList>
      <p>
        We may remove content or suspend an account that breaks these rules. To report a quiz,
        write to <MailLink address={LEGAL_ENTITY.contactEmail} /> with a link to it.
      </p>
    </LegalSection>

    <LegalSection title="5. AI-generated content">
      <p>
        Quizzes made with the AI generator can contain mistakes. Review them before you rely on
        them or use them in class. Do not include personal information in the text you give the
        generator: that text is sent to our AI provider to produce the questions.
      </p>
    </LegalSection>

    <LegalSection title="6. Teachers and classes">
      <p>
        If you create a Class, you decide which pupils' names are entered. Enter first names or
        nicknames only, and only with your school's permission. Those names are stored for you
        alone, are never shown publicly, and are deleted with your account.
      </p>
    </LegalSection>

    <LegalSection title="7. Paid plans">
      <p>
        {LEGAL_ENTITY.productName} is free to use. The Plus and Teacher plans add higher limits
        and are described on the <LegalLink to="/pricing">pricing page</LegalLink>. They are
        subscriptions, billed monthly or yearly, and renew automatically until cancelled.
      </p>
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the
        Merchant of Record for all our orders: it takes the payment, issues the invoice and
        handles tax, and its{" "}
        <ExternalLegalLink href="https://www.paddle.com/legal/checkout-buyer-terms">
          buyer terms
        </ExternalLegalLink>{" "}
        apply to your purchase.
      </p>
      <p>
        You can cancel at any time from your account settings. You keep your plan until the end of
        the period you paid for, and nothing you made is deleted when a plan ends — only creating
        more than the free limits allow is paused. Refunds are covered by our{" "}
        <LegalLink to="/refunds">Refund Policy</LegalLink>.
      </p>
    </LegalSection>

    <LegalSection title="8. Availability and changes">
      <p>
        We work to keep the service running, but we do not promise it will be uninterrupted or
        free of errors. We may add, change or remove features. If a change materially reduces what
        a paid plan includes, we will tell subscribers by email beforehand.
      </p>
    </LegalSection>

    <LegalSection title="9. Liability">
      <p>
        The service is provided as it is. To the extent the law allows, we are not liable for
        indirect or consequential loss, and our total liability to you is limited to the amount
        you paid us in the twelve months before the claim. Nothing here limits rights you have as
        a consumer that cannot be limited by law.
      </p>
    </LegalSection>

    <LegalSection title="10. Ending your use">
      <p>
        You can stop using the service and close your account at any time. We may suspend or close
        an account that breaks these terms; where it is reasonable to do so, we will warn you
        first.
      </p>
    </LegalSection>

    <LegalSection title="11. Law and changes to these terms">
      <p>
        These terms are governed by the laws of the Republic of Kosovo. If you are a consumer in
        another country, you keep the protection of the mandatory laws of the country you live in.
      </p>
      <p>
        When we change these terms materially we update the version above and tell signed-in users
        the next time they use the service.
      </p>
    </LegalSection>

    <LegalSection title="12. Contact">
      <p>
        Questions about these terms: <MailLink address={LEGAL_ENTITY.contactEmail} />. See also our{" "}
        <LegalLink to="/privacy">Privacy Policy</LegalLink>.
      </p>
    </LegalSection>
  </LegalPage>
);
