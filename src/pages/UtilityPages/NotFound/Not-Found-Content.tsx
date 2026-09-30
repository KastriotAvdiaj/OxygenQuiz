import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { ErrorAction, ErrorScreen } from "../Error-Screen";
import { FourOhFour } from "./Four-Oh-Four";

interface NotFoundContentProps {
  title?: string;
  message?: string;
  linkText?: string;
  linkTo?: string;
  /** A second, quieter way out — the public 404 offers the quiz list. */
  secondary?: { text: string; to: string };
  /** Standalone page (its own scroll container) or inside a layout that has one. */
  fullViewport?: boolean;
}

/**
 * Every "not found": the globe "404" (`FourOhFour`), a title, a line of explanation and a way
 * back. Used by the app's 404 route (`NotFoundRoute`) and by the dashboard's resource-not-found
 * (`DashboardErrorElement`). Layout from `ErrorScreen` — no card.
 */
export const NotFoundContent = ({
  title = "Page not found",
  message = "Sorry, the page or resource you're looking for doesn't exist.",
  linkText = "Go back to a safe place",
  linkTo = "/",
  secondary,
  fullViewport = true,
}: NotFoundContentProps) => (
  <ErrorScreen
    fullViewport={fullViewport}
    hero={<FourOhFour />}
    title={title}
    message={message}
    actions={
      <>
        {/* tabIndex -1 on the links: the button inside is the focus stop, not both. */}
        <Link to={linkTo} tabIndex={-1}>
          <ErrorAction>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            {linkText}
          </ErrorAction>
        </Link>
        {secondary && (
          <Link to={secondary.to} tabIndex={-1}>
            <ErrorAction secondary>
              <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              {secondary.text}
            </ErrorAction>
          </Link>
        )}
      </>
    }
  />
);
