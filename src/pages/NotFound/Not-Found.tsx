import { Link } from "react-router-dom";

export const NotFoundRoute = () => {
  return (
    <div className="mt-52 flex flex-col items-center font-semibold">
      <h1>404 - Not Found</h1>
      <p>Sorry, the page you are looking for does not exist.</p>
      <Link to="/" replace className="text-[var(--text-hover)] hover:text-[var(--text-hover-darker)]">
        Go to Home
      </Link>
    </div>
  );
};
