import { LEGAL_ENTITY } from "./legal-entity";
import { LegalLink, LegalPage, LegalSection, MailLink } from "./legal-page";

/** `/refunds` — docs/proposals/legal-and-compliance-for-launch.md §2.1. */
export const RefundsPage = () => (
  <LegalPage title="Refund Policy">
    <LegalSection title="14-day refund">
      <p>
        If a paid plan is not right for you, ask within 14 days of your first payment and you get
        a full refund, no questions asked.
      </p>
    </LegalSection>

    <LegalSection title="How to ask">
      <p>
        Write to <MailLink address={LEGAL_ENTITY.contactEmail} /> from the email address of your
        account, or use the link in the receipt Paddle sent you. Payments are handled by Paddle,
        our reseller and Merchant of Record, which sends the money back to the payment method you
        used. It usually arrives within a few working days.
      </p>
    </LegalSection>

    <LegalSection title="Cancelling">
      <p>
        You can cancel a subscription at any time from your account settings. Cancelling stops the
        next renewal; you keep your plan until the end of the period you already paid for, and
        nothing you made is deleted.
      </p>
      <p>
        Renewal payments are not refunded after the first 14 days of a subscription, except where
        the law gives you that right.
      </p>
    </LegalSection>

    <LegalSection title="More">
      <p>
        Plans and prices are on the <LegalLink to="/pricing">pricing page</LegalLink>. The rest is
        in our <LegalLink to="/terms">Terms of Service</LegalLink>.
      </p>
    </LegalSection>
  </LegalPage>
);
