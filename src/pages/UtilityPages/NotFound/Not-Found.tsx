import { NotFoundContent } from "./Not-Found-Content";

export const NotFoundRoute = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <NotFoundContent
        message="Oops! The page you're looking for doesn't exist. It might have been moved or deleted."
        linkText="Go back to Home Page"
        linkTo="/"
      />
    </div>
  );
};
