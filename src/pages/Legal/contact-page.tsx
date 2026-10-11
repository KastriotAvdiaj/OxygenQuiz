import { LEGAL_ENTITY } from "./legal-entity";
import { LegalPage, LegalSection, MailLink } from "./legal-page";

/** `/contact` — who runs the site (docs/proposals/legal-and-compliance-for-launch.md §2.1). */
export const ContactPage = () => (
  <LegalPage title="Contact">
    <LegalSection title="Get in touch">
      <p>
        Questions, problems, a quiz to report, a refund, or anything about your personal data:
        write to <MailLink address={LEGAL_ENTITY.contactEmail} />.
      </p>
    </LegalSection>

    <LegalSection title="Who runs OxygenQuiz">
      <p>
        {LEGAL_ENTITY.productName} is a quiz platform for playing, creating and hosting quizzes —
        alone, live with friends, or in a classroom.
      </p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
        <dt className="font-semibold">Run by</dt>
        <dd>{LEGAL_ENTITY.operatorName}</dd>
        <dt className="font-semibold">Location</dt>
        <dd>{LEGAL_ENTITY.location}</dd>
      </dl>
    </LegalSection>
  </LegalPage>
);
