import * as React from "react";

/**
 * What a question list shows when nothing matches: a line saying so, and the type's create
 * drawer behind an "Add a question" button (`emptyState` on the create forms).
 *
 * Inside a dashboard card already, so it carries no surface of its own.
 */
export const EmptyQuestionList = ({
  typeName,
  children,
}: {
  /** As it reads mid-sentence: "multiple choice", "true/false", "Type the Answer". */
  typeName: string;
  /** The create form, rendered with `emptyState`. */
  children: React.ReactNode;
}) => (
  <div className="flex flex-col items-center gap-4 py-8 text-center text-muted-foreground">
    <p>No {typeName} questions match these filters.</p>
    {children}
  </div>
);
