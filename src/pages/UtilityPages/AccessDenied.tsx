import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiftedButton } from "@/common/LiftedButton";

export const AccessDeniedPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-primary/10 border dark:border-muted">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full ">
            <AlertTriangle className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary justify-center flex">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-lg">
            Sorry, you do not have the necessary permissions to view this page.
          </p>
          <p className="border dark:border-muted rounded-md text-xs p-2 text-center text-gray/500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
            If you believe this is an error, please contact your administrator.
          </p>
          <section className="flex items-center justify-center">
            <LiftedButton className="self-center px-6 text-sm">
              <Link to="/">Back to Home Page</Link>
            </LiftedButton>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
