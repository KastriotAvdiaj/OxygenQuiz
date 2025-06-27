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
    <Card className="w-full max-w-md text-center shadow-lg">
      <CardHeader>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <SearchX className="h-10 w-10 text-blue-500 dark:text-blue-400" />
        </div>
        <CardTitle className="mt-4 text-3xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <p className="text-muted-foreground">{message}</p>
        <Button variant="fancy" className="mt-6 w-full ">
          <Link to={linkTo}>{linkText}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
