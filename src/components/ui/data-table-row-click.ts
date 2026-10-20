import type * as React from "react";

/**
 * Whether a click on a row should count as "open this row". Only a click that lands in the row's
 * own DOM, not on something interactive inside it, and not the end of a text selection.
 */
export function isRowClick(event: React.MouseEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement | null;
  if (!target || !event.currentTarget.contains(target)) return false;
  if (target.closest('button, a, input, select, textarea, label, [role="menuitem"], [role="checkbox"]')) {
    return false;
  }
  return !window.getSelection?.()?.toString();
}
