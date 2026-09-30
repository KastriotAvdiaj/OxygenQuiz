import { NotFoundContent } from "./Not-Found-Content";

/** The app's 404 route: unmatched URLs, and thrown 404 responses (RouteErrorElement). */
export const NotFoundRoute = () => (
  <NotFoundContent
    title="Page not found"
    message="We looked everywhere — even the other side of the world. This page may have moved, or it never existed."
    linkText="Back home"
    linkTo="/"
    secondary={{ text: "Browse quizzes", to: "/choose-quiz" }}
  />
);
