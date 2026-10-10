import { Link } from "react-router-dom";
import { LEGAL_ENTITY } from "@/pages/Legal/legal-entity";

const LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/refunds", label: "Refunds" },
  { to: "/contact", label: "Contact" },
];

/**
 * The public pages' footer: where the legal pages are linked from
 * (docs/proposals/legal-and-compliance-for-launch.md §2.1). Opted into per route through
 * `HomeLayout`'s `footer` prop — never on play, lobby or host routes, where the screen is the game.
 */
export const SiteFooter = () => (
  <footer className="border-t border-foreground/15 px-4 py-6 text-sm text-muted-foreground">
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p>
        © {new Date().getFullYear()} {LEGAL_ENTITY.productName}
      </p>
      <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);
