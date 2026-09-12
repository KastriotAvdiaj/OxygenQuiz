import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface ContentLayoutProps {
  /**
   * Heading for the card's own header bar. **Optional**: a page whose content already opens with
   * its own `<h1>` should omit it rather than print a second, smaller title above the first.
   * When omitted the header bar is not rendered at all — no empty strip, no stray border.
   */
  title?: string;
  children: React.ReactNode;
  /**
   * Classes for the card itself — pass `mx-auto max-w-5xl` to make the card hug its content
   * instead of spanning the viewport.
   *
   * This belongs on the **card**, not on the content box inside it. Constraining only the inner
   * box (which is what `contentClassName` did) leaves the card at full width with a wide empty
   * band down each side of the content — the frame says "this is how much room there is" while
   * the content sits in the middle ignoring it.
   *
   * Opt-in, and deliberately not a default: this layout is shared with the dashboard's wide
   * data-table pages, which want every pixel of a large monitor.
   */
  className?: string;
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <Card
      className={cn(
        "w-full mt-4 bg-background border border-border shadow-lg",
        className
      )}
    >
      {title && (
        <CardHeader className="border-b border-input mb-4">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!title && "pt-6")}>{children}</CardContent>
    </Card>
  );
};
