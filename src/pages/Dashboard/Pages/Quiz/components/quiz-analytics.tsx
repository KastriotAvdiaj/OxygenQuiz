import { useQuizAnalytics } from "../api/get-quiz-analytics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Theme-aware colors so the charts match light/dark mode.
const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";
const ACCENT = "hsl(142 71% 45%)"; // green for "completed"

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
} as const;

const formatDuration = (seconds: number) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const EmptyAnalytics = ({ message }: { message: string }) => (
  <div className="text-center py-8">
    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

export const QuizAnalytics = ({ quizId }: { quizId: number }) => {
  const { data, isLoading, isError } = useQuizAnalytics({ quizId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Reports are owner-scoped on the backend (404 if you don't own the quiz).
  if (isError || !data) {
    return <EmptyAnalytics message="Analytics aren't available for this quiz." />;
  }

  if (data.attempts === 0) {
    return (
      <EmptyAnalytics message="Analytics will be available once the quiz has responses." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Attempts" value={data.attempts} />
        <StatCard
          label="Completion rate"
          value={`${data.completionRate}%`}
          hint={`${data.completed} completed · ${data.abandoned} abandoned`}
        />
        <StatCard label="Avg. score" value={data.averageScore} />
        <StatCard label="Highest score" value={data.highestScore} />
        <StatCard
          label="Avg. duration"
          value={formatDuration(data.averageDurationSeconds)}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attempts over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.attemptsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  tick={{ fill: MUTED, fontSize: 12 }}
                />
                <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(label) => formatDay(String(label))}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Score distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                <Bar
                  dataKey="count"
                  name="Attempts"
                  fill={PRIMARY}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-question breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Per-question breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-24 text-right">Answered</TableHead>
                <TableHead className="w-48">Correct rate</TableHead>
                <TableHead className="w-24 text-right">Avg. time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.questions.map((q) => (
                <TableRow key={q.questionId}>
                  <TableCell className="text-muted-foreground">{q.order}</TableCell>
                  <TableCell className="max-w-sm truncate" title={q.text}>
                    {q.text}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{q.type}</TableCell>
                  <TableCell className="text-right">{q.timesAnswered}</TableCell>
                  <TableCell>
                    {q.timesAnswered === 0 ? (
                      <span className="text-muted-foreground text-sm">No data</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Progress value={q.correctRate} className="h-2" />
                        <span className="text-sm tabular-nums w-12 text-right">
                          {q.correctRate}%
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDuration(q.averageTimeSeconds)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
