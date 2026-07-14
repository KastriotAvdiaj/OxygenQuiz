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
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
};

/**
 * One settings group. Compact by design: icon and title share a slim header
 * row (the description doubles as its subtitle), rows are tight and divided
 * by hairlines, and the card sits on a subtle --primary-edge like the rest
 * of the app's surfaces.
 */
export const Section = ({ icon: Icon, title, description, children }: SectionProps) => (
  <section className="h-fit rounded-xl border border-border bg-card shadow-[0_2px_0_0_var(--primary-edge)]">
    <header className="flex items-center gap-2.5 border-b border-border px-4 py-3 sm:px-5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </header>
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
    className={`flex items-center justify-between gap-4 py-3 ${
      dimmed ? "opacity-50" : ""
    }`}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
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
