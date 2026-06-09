import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui/badge";

export const SoonBadge = () => (
  <Badge
    variant="outline"
    className="text-[10px] uppercase tracking-wide text-muted-foreground"
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

export const Section = ({ icon: Icon, title, description, children }: SectionProps) => (
  <Card className="border dark:border-foreground/30 mb-6 bg-background">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent className="divide-y divide-border pt-0">{children}</CardContent>
  </Card>
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
    className={`flex items-center justify-between gap-4 py-4 first:pt-4 last:pb-0 ${
      dimmed ? "opacity-50" : ""
    }`}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium">{title}</span>
        {soon && <SoonBadge />}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
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
  <div className="flex items-center gap-3 w-44">
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary disabled:cursor-not-allowed"
    />
    <span className="text-sm tabular-nums w-9 text-right text-muted-foreground">
      {value}%
    </span>
  </div>
);