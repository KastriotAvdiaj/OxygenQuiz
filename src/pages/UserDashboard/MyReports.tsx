import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson, Loader2, BarChart3 } from "lucide-react";
import { useNotifications } from "@/common/Notifications";
import {
  fetchQuizPerformance,
  fetchQuestionAnalytics,
  exportReport,
  type ReportType,
  type ReportExportFormat,
  type QuizPerformanceRow,
  type QuestionAnalyticsRow,
} from "./api/reports";
import { LiftedButton } from "@/common/LiftedButton";
import { BookPlus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Column = { header: string; render: (row: any) => React.ReactNode };

const QUIZ_COLUMNS: Column[] = [
  { header: "Quiz", render: (r: QuizPerformanceRow) => r.title },
  { header: "Attempts", render: (r: QuizPerformanceRow) => r.attempts },
  { header: "Completed", render: (r: QuizPerformanceRow) => r.completed },
  { header: "Abandoned", render: (r: QuizPerformanceRow) => r.abandoned },
  { header: "Completion %", render: (r: QuizPerformanceRow) => `${r.completionRate}%` },
  { header: "Avg score", render: (r: QuizPerformanceRow) => r.averageScore },
  { header: "Avg time", render: (r: QuizPerformanceRow) => `${Math.round(r.averageDurationSeconds)}s` },
];

const QUESTION_COLUMNS: Column[] = [
  { header: "Question", render: (r: QuestionAnalyticsRow) => r.text },
  { header: "Type", render: (r: QuestionAnalyticsRow) => r.type },
  { header: "Category", render: (r: QuestionAnalyticsRow) => r.category },
  { header: "In quizzes", render: (r: QuestionAnalyticsRow) => r.timesUsedInQuizzes },
  { header: "Answered", render: (r: QuestionAnalyticsRow) => r.timesAnswered },
  { header: "Correct", render: (r: QuestionAnalyticsRow) => r.correctCount },
  { header: "Correct %", render: (r: QuestionAnalyticsRow) => `${r.correctRate}%` },
];

const REPORTS: { id: ReportType; label: string; columns: Column[] }[] = [
  { id: "quiz-performance", label: "Quiz Performance", columns: QUIZ_COLUMNS },
  { id: "question-analytics", label: "Question Analytics", columns: QUESTION_COLUMNS },
];

export const MyReports = () => {
  const addNotification = useNotifications((s) => s.addNotification);

  const [type, setType] = useState<ReportType>("quiz-performance");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const active = REPORTS.find((r) => r.id === type)!;
  const criteria = { from: from || undefined, to: to || undefined };

  const generate = async () => {
    try {
      setLoading(true);
      const data =
        type === "quiz-performance"
          ? await fetchQuizPerformance(criteria)
          : await fetchQuestionAnalytics(criteria);
      setRows(data);
    } catch {
      addNotification({ type: "error", title: "Could not generate report" });
    } finally {
      setLoading(false);
    }
  };

  const doExport = async (format: ReportExportFormat) => {
    try {
      setExporting(true);
      await exportReport(type, format, criteria);
    } catch {
      addNotification({ type: "error", title: "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  const switchType = (next: ReportType) => {
    setType(next);
    setRows(null); // results don't carry across report types
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      <Card className="bg-background border dark:border-foreground/30 mb-6">
        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          {/* Report type */}
          <div className="flex flex-col gap-2 mb-4">
          <p className="text-sm text-muted-foreground">
            Choose a report type to get started.
          </p>
          
          <Tabs value={type} onValueChange={(v) => switchType(v as ReportType)}>
            <TabsList className="">
              {REPORTS.map((r) => (
                <TabsTrigger key={r.id} value={r.id}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

          {/* Criteria + actions */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">From</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm focus:border-primary/60 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">To</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm focus:border-primary/60 focus:outline-none"
              />
            </div>

            <LiftedButton onClick={generate} disabled={loading} className="gap-2 text-sm">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <BookPlus className="h-4 w-4" />
              Generate
            </LiftedButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <LiftedButton disabled={!rows || rows.length === 0 || exporting} className="gap-2 text-sm">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export
                </LiftedButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => doExport("csv")}>
                  <FileText className="mr-2 h-4 w-4" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("json")}>
                  <FileJson className="mr-2 h-4 w-4" /> JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave dates empty for all-time. Reports cover the quizzes and questions you created.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-background border dark:border-foreground/30">
        <CardContent className="p-0">
          {rows === null ? (
            <p className="text-center text-muted-foreground py-12">
              Choose a report and press <span className="font-semibold">Generate</span>.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data for this report.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/15 text-left text-muted-foreground">
                    {active.columns.map((c) => (
                      <th key={c.header} className="px-4 py-3 font-medium whitespace-nowrap">
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-foreground/10 hover:bg-muted/50">
                      {active.columns.map((c) => (
                        <td key={c.header} className="px-4 py-2.5 whitespace-nowrap">
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyReports;
