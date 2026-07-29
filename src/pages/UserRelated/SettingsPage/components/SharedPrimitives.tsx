import React from "react";
import { Badge } from "@/components/ui/badge";

export const SoonBadge = () => (
  <Badge
    variant="outline"
    className="px-1.5 py-0 text-[10px] uppercase tracking-wide text-muted-foreground"
  >
    Soon
  </Badge>
);

type SectionProps = {
  children: React.ReactNode;
};

/**
 * One settings group: a plain card of hairline-divided rows.
 *
 * No header of its own. Each group is now a section of the account overlay
 * (docs/development/account-overlay.md), which already names it in the pane header and
 * highlights it in the sidebar — an in-card title repeated the same word twice on one
 * screen. No primary-coloured bottom edge either: that treatment belongs to interactive
 * controls (buttons, selects), and on a static container it read as an accent with no
 * meaning behind it.
 */
export const Section = ({ children }: SectionProps) => (
  <section className="h-fit rounded-xl border border-border bg-card">
    <div className="divide-y divide-border/70 px-4 sm:px-5">{children}</div>
  </section>
);

type RowProps = {
  title: string;
  description?: string;
  control: React.ReactNode;
  soon?: boolean;
  dimmed?: boolean;
};

export const Row = ({ title, description, control, soon, dimmed }: RowProps) => (
  <div
    className={`flex items-center justify-between gap-4 py-2.5 ${
      dimmed ? "opacity-50" : ""
    }`}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm">{title}</span>
        {soon && <SoonBadge />}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

type VolumeProps = {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
};

export const VolumeSlider = ({ value, onChange, disabled }: VolumeProps) => (
  <div className="flex w-40 items-center gap-2.5">
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
    />
    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
      {value}%
    </span>
  </div>
);
