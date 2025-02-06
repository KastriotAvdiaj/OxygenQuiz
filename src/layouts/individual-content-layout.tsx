import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  title,
  children,
}) => {
  return (
    <Card className="w-full max-w-3xl ml-8 mt-8 bg-muted">
      <CardHeader className="border-b border-input mb-8">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
