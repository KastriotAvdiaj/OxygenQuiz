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
    <Card className="w-full mt-4 bg-background border border-border shadow-lg">
      <CardHeader className="border-b border-input mb-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
