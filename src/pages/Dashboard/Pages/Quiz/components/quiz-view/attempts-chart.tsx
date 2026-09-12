import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
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

/** Axis ticks: short, because there are a lot of them. */
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Tooltip heading: long, because there is one of them and it should read as a sentence.
 *
 * <b>No `timeZone` override, deliberately.</b> The server now buckets in the viewer's own zone
 * and sends each key as an offset-less `2026-09-11T00:00:00`, which JavaScript parses as local
 * midnight — so the default (local) formatting lands on exactly the day the bucket counts.
 * Forcing UTC here, as this did while the buckets were UTC, would now undo the fix.
 */
const formatDayLong = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export interface AttemptsChartProps {
  points: AttemptsByDayPoint[];
  totalAttempts: number;
}

/**
 * Attempts over time — as a trend once there is a trend, and as a list of runs before that.
 *
 * <b>Under `MIN_ATTEMPTS_FOR_TREND` there is no chart at all.</b> This used to draw a full
 * 240px-high scatter plot with grid lines, two axes and a caption apologising for itself, to
 * show two or three dots. Three days of data cannot support a chart that size: the axes imply a
 * range worth reading, the grid implies precision worth measuring against, and the reader spends
 * more effort decoding the frame than there is information inside it. The same three facts fit
 * on three lines, where each one is exact and none of them has to be read off an axis — and the
 * caption explaining why the chart isn't a trend becomes unnecessary, because nothing on screen
 * claims to be one.
 *
 * A filled line through three days would say "this is the shape of things", and the first quiz
 * to get two plays on a Tuesday would appear to be growing. Past the threshold, where a
 * direction means something, the area chart returns unchanged.
 *
 * <b>Days are bucketed in the viewer's time zone</b>, not the server's. The client sends its
 * IANA zone with the analytics request and `ReportService` shifts each `StartTime` into it before
 * truncating, so a play at 01:00 in UTC+2 is counted on the day its player experienced. Keys
 * therefore arrive offset-less (`2026-09-11T00:00:00`) and must be read as local — see
 * `formatDayLong`. docs/quiz/quiz-analytics-page.md has the whole path.
 *
 * This is not the same as "what time of day do players play": that needs each player's own zone
 * recorded at session creation, which nothing stores yet
 * (docs/proposals/quiz-view-redesign.md §8, step 2).
 */
export const AttemptsChart = ({ points, totalAttempts }: AttemptsChartProps) => {
  if (totalAttempts < MIN_ATTEMPTS_FOR_TREND) {
    return <RecentAttempts points={points} />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={MUTED} opacity={0.2} />
        <XAxis dataKey="date" tickFormatter={formatDay} stroke={MUTED} fontSize={12} />
        <YAxis stroke={MUTED} fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => formatDayLong(String(label))}
          // Recharts' default is " : " — two stray spaces around the colon.
          separator=": "
        />
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
    </ResponsiveContainer>
  );
};

/**
 * The low-data view: the days that actually have plays, most recent first, as text.
 *
 * <b>Why not a sparkline.</b> A sparkline is a trend stripped of its axes — it still asks the
 * reader to infer a direction, which is the exact claim three data points can't support, and it
 * would have needed the same "this isn't really a trend" caption the full chart did. A list
 * makes no claim: each line is one day and one number, both exact, and an owner with four plays
 * wants to know *which days* far more than they want a shape.
 *
 * Newest first because that is the question — "has anyone played it lately?" — and the answer is
 * then the first line rather than the last.
 *
 * <b>No caption.</b> The old view carried "Each mark is one day's attempts. Trends need about 10
 * runs before they mean anything" — a sentence that existed only to explain why the chart above
 * it shouldn't be read as a chart. Once nothing on screen claims to be a trend there is nothing
 * to disclaim, and the list needs no legend: a date and a count are self-describing.
 */
const RecentAttempts = ({ points }: { points: AttemptsByDayPoint[] }) => {
  if (points.length === 0) return null;

  // Newest first. `points` arrives ascending from the server; copy before reversing.
  const recent = [...points].reverse();

  return (
    <ul className="divide-y divide-border">
      {recent.map((point) => (
        <li
          key={point.date}
          className="flex items-baseline justify-between gap-4 py-1.5 text-sm"
        >
          <span className="text-muted-foreground">{formatDayLong(point.date)}</span>
          <span className="tabular-nums">
            {point.attempts === 1 ? "1 attempt" : `${point.attempts} attempts`}
          </span>
        </li>
      ))}
    </ul>
  );
};
