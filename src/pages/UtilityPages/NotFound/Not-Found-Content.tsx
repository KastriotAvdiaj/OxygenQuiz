import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiftedButton } from "@/common/LiftedButton";

interface NotFoundContentProps {
  title?: string;
  message?: string;
  linkText?: string;
  linkTo?: string;
}

// This is the reusable UI for any "Not Found" scenario
export const NotFoundContent = ({
  title = "404 - Not Found",
  message = "Sorry, the page or resource you're looking for doesn't exist.",
  linkText = "Go back to a safe place",
  linkTo = "/",
}: NotFoundContentProps) => {
  // Sizing matches the other error screens (MainErrorFallback, StaleVersionNotice): a compact
  // card on phones rather than a full-width block of oversized display type.
  return (
    <Card className="w-full max-w-xs text-center shadow-lg font-quiz sm:max-w-md">
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg font-bold leading-tight sm:text-3xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{message}</p>
        <Link to={linkTo}>
          <LiftedButton className="w-full text-sm sm:text-base">
            {linkText}
          </LiftedButton>
        </Link>
      </CardContent>
    </Card>
  );
};
