import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AccessDeniedPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <AlertTriangle className="h-10 w-10 text-yellow-500 dark:text-yellow-400" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sorry, you do not have the necessary permissions to view this page.
            If you believe this is an error, please contact your administrator.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/">Go back to Home Page</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
