import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_DOCUMENTS } from "./legal-entity";

/** The shared frame of `/terms`, `/privacy`, `/refunds` and `/contact`: a title and readable prose. */
export const LegalPage = ({
  title,
  versioned = false,
  children,
}: {
  title: string;
  /** Terms and Privacy carry a version, so "which Terms did this user accept" has an answer. */
  versioned?: boolean;
  children: ReactNode;
}) => (
  <div className="flex flex-1 flex-col items-center px-4 py-10 text-foreground">
    <article className="flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Last updated {LEGAL_DOCUMENTS.lastUpdated}
          {versioned && ` · Version ${LEGAL_DOCUMENTS.version}`}
        </p>
      </header>
      {children}
    </article>
  </div>
);

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground/90">{children}</div>
  </section>
);

export const LegalList = ({ children }: { children: ReactNode }) => (
  <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>
);

export const LegalLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-primary underline underline-offset-2">
    {children}
  </Link>
);

export const ExternalLegalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
    {children}
  </a>
);

export const MailLink = ({ address }: { address: string }) => (
  <a href={`mailto:${address}`} className="text-primary underline underline-offset-2">
    {address}
  </a>
);
