import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AttemptsByDayPoint } from "@/types/analytics-types";

import { MIN_ATTEMPTS_FOR_TREND } from "./thresholds";

// Unchanged from the previous Analytics tab — this is a layout change, not a restyle, so the
// series keep the colors they had. Note `--chart-1..5` exist in global.css and are unused; if
// these charts are ever reworked, that is the palette to move to.
const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";
const ACCENT = "hsl(142 71% 45%)";

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
} as const;

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export interface AttemptsChartProps {
  points: AttemptsByDayPoint[];
  totalAttempts: number;
}

/**
 * Attempts over time — as a trend once there is a trend, and as plotted points before that.
 *
 * <b>Under `MIN_ATTEMPTS_FOR_TREND` the area chart is withheld.</b> A filled line through three
 * days says "this is the shape of things", and three days cannot support that claim; the first
 * quiz to get two plays on a Tuesday would appear to be growing. The axis frame stays so the
 * panel doesn't jump when the tenth attempt arrives — only the mark changes, from a line to the
 * individual runs.
 *
 * <b>Days are bucketed by the server in UTC</b> (`ReportService`, `s.StartTime.Date`), so a play
 * at 01:00 in UTC+2 lands on the previous day here. That is a real defect and it is not fixed in
 * this component — the fix belongs where the bucketing happens. See
 * docs/proposals/quiz-view-redesign.md §8.
 */
export const AttemptsChart = ({ points, totalAttempts }: AttemptsChartProps) => {
  const sparse = totalAttempts < MIN_ATTEMPTS_FOR_TREND;

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={240}>
        {sparse ? (
          <ScatterChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={MUTED} opacity={0.2} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              stroke={MUTED}
              fontSize={12}
            />
            <YAxis stroke={MUTED} fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => formatDay(String(label))} />
            <Scatter name="Attempts" dataKey="attempts" fill={PRIMARY} />
          </ScatterChart>
        ) : (
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={MUTED} opacity={0.2} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              stroke={MUTED}
              fontSize={12}
            />
            <YAxis stroke={MUTED} fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => formatDay(String(label))} />
            <Legend />
            <Area
              type="monotone"
              dataKey="attempts"
              name="Attempts"
              stroke={PRIMARY}
              fill={PRIMARY}
              fillOpacity={0.2}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke={ACCENT}
              fill={ACCENT}
              fillOpacity={0.2}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

      {sparse && (
        <p className="text-xs text-muted-foreground">
          Each mark is one day&apos;s attempts. Trends need about{" "}
          {MIN_ATTEMPTS_FOR_TREND} runs before they mean anything.
        </p>
      )}
    </div>
  );
};
