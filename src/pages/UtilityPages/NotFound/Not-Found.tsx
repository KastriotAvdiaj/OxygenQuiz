import { GoBackButton } from "@/common/Go-Back-Button";

export const NotFoundRoute = () => {
  return (
    <div className="h-screen flex items-center justify-center font-semibold bg-muted text-foreground">
      <div className="flex flex-col items-center justify-center">
        <h1>404 - Page Not Found</h1>
        <p>Sorry, the page you are looking for does not exist.</p>
        <GoBackButton variant="normal" />
      </div>
    </div>
  );
};
