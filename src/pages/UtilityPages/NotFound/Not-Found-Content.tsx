import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <Card className="w-full max-w-md text-center shadow-lg font-quiz">
      <CardHeader>
        <CardTitle className="mt-4 text-3xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <p className="text-muted-foreground">{message}</p>
        <Link to={linkTo}>
          <Button variant="fancy" className="mt-6 w-full ">
            {linkText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
